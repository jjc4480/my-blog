---
title: "Go 리더보드 캐시 — Redis + singleflight 설계"
date: "2026-04-30"
published: false
category: "언어"
tags: ["Go", "redis", "cache", "singleflight", "performance"]
description: "매 요청마다 전체 정렬을 반복하던 리더보드를 Redis 캐시로 바꾼 과정. ID 캐시 + hydration + singleflight + 카테고리 단위 무효화까지 단계별로 정리한다."
---

## 배경

리더보드 화면은 흔히 이렇게 구현된다.

1. 카테고리별로 모든 사용자의 기록을 DB에서 가져온다.
2. 유효하지 않은 기록을 걸러낸다.
3. 정렬 기준(평균/최고/누적 등 도메인에 따라 다름)을 적용한다.
4. 정렬한다.
5. Top N 잘라서 반환한다.

처음에는 단순하다. 사용자가 적고 카테고리가 몇 개 없을 때는 매 요청마다 다 계산해도 별 문제 없다.
문제는 화면이 자주 호출되는 페이지일 때다. 리더보드를 띄울 때마다 DB에서 모든 기록을
가져와서 정렬하는 로직이 매 사용자마다 반복된다.

이 글은 그 반복을 Redis 기반 캐시로 바꾼 과정의 기록이다. 단순히
Redis에 통째로 저장하는 것이 아니라, 캐시를 어떻게 설계하고 무엇을 저장할지, 동시 요청을
어떻게 막을지, 쓰기 시점에 어떻게 무효화할지를 짚어본다.

## 처음 떠오르는 단순한 방법과 그 한계

가장 먼저 떠오르는 건 "정렬된 결과 객체를 통째로 캐시에 넣자"다.

```go
type LeaderboardEntry struct {
    Rank      int
    UserID    int
    User      *User      // 이름, 프로필 사진, 닉네임 …
    Score     float64
    Records   []float64
    CreatedAt time.Time
}

cache.Set(ctx, "leaderboard:category-a", entries, 30*time.Minute)
```

문제는 `User` 같은 자식 객체가 같이 캐시에 들어가는 순간 캐시 무효화 정책이 복잡해진다는 점이다.

- 사용자가 닉네임을 바꾸면 리더보드 캐시도 다 날려야 한다.
- 사용자가 프로필 사진을 바꾸어도 마찬가지.
- 사용자 1명이 변경됐을 뿐인데 전체 캐시를 날리는 건 과하다.

리더보드 캐시의 본질은 **"누가 몇 등인지"** 라는 정렬 결과지, 그 사용자의 최신 정보가 아니다.
그래서 캐시에는 ID만 저장하고, 본문 데이터는 매번 DB에서 다시 조회(hydrate)하는 게 깔끔하다.

## 1단계 — ID 캐시 + DB hydration

캐시 DTO에는 정렬 결과를 만드는 데 필요한 최소한의 정보만 둔다.

```go
type CachedRankEntry struct {
    Rank     int       `json:"rank"`
    Score    float64   `json:"score"`
    UserID   int       `json:"user_id"`
    Category string    `json:"category"`
    Records  []float64 `json:"records,omitempty"`
}
```

User 객체는 들어가지 않는다. 캐시를 읽은 후 ID 목록으로 다시 사용자 정보를 일괄 조회한다.

```go
func (s *leaderboardService) loadFromCache(ctx context.Context, category string) ([]Entry, error) {
    cached, err := s.cache.Get(ctx, category)
    if err != nil || cached == nil {
        return nil, err
    }

    userIDs := make([]int, 0, len(cached))
    seen := make(map[int]struct{}, len(cached))
    for _, e := range cached {
        if _, ok := seen[e.UserID]; ok {
            continue
        }
        seen[e.UserID] = struct{}{}
        userIDs = append(userIDs, e.UserID)
    }

    usersByID, err := s.userRepo.GetByIDs(ctx, userIDs)
    if err != nil {
        return nil, fmt.Errorf("hydrate failed: %w", err)
    }

    entries := make([]Entry, 0, len(cached))
    for _, c := range cached {
        u := usersByID[c.UserID]
        if u == nil {
            continue
        }
        entries = append(entries, Entry{
            Rank: c.Rank, Score: c.Score, User: u, Records: c.Records,
        })
    }
    return entries, nil
}
```

이렇게 하면 사용자 정보가 바뀌어도 리더보드 캐시는 그대로 둘 수 있다.
다음 hydration 시점에 자연스럽게 최신 정보가 따라온다.

캐시 키는 카테고리 단위로 분리한다.

```go
func cacheKey(category string) string {
    return fmt.Sprintf("leaderboard:%s", category)
}
```

한 카테고리에서 기록이 바뀌었을 때 그 카테고리만 무효화할 수 있다.

## 2단계 — singleflight로 thundering herd 막기

캐시가 막 만료된 직후 동시에 100개의 요청이 들어오면 100개 요청이 모두 "캐시 미스"를
경험한다. 그리고 100번 같은 정렬을 DB에서 돌린다. 이게 **thundering herd**다.

`golang.org/x/sync/singleflight` 가 정확히 이 문제를 해결한다. 같은 키로 들어오는 동시
요청을 묶어서 한 번만 실행하고, 결과를 모두에게 공유한다.

```go
import "golang.org/x/sync/singleflight"

type leaderboardService struct {
    cache      LeaderboardCache
    repo       UserRepository
    cacheGroup singleflight.Group
}

func (s *leaderboardService) getRanking(ctx context.Context, category string) ([]Entry, error) {
    // 1차 시도: 빠른 캐시 hit
    if cached, err := s.cache.Get(ctx, category); err == nil && cached != nil {
        return s.hydrate(ctx, cached)
    }

    // 캐시 미스 — singleflight로 묶기
    value, err, _ := s.cacheGroup.Do(category, func() (any, error) {
        // double-check: 다른 고루틴이 이미 채워뒀을 수 있다
        if cached, err := s.cache.Get(ctx, category); err == nil && cached != nil {
            return s.hydrate(ctx, cached)
        }

        entries, err := s.calculateFromDB(ctx, category)
        if err != nil {
            return nil, err
        }

        _ = s.cache.Set(ctx, category, toCacheEntries(entries))
        return entries, nil
    })
    if err != nil {
        return nil, err
    }
    return value.([]Entry), nil
}
```

핵심은 두 가지.

- **double-check**: `singleflight.Do` 안에서도 다시 한 번 캐시를 확인한다. 첫 번째
  고루틴이 DB 조회 + 캐시 저장을 마쳤을 때, 그 직후 합류하는 고루틴은 굳이 다시
  계산할 필요가 없다.
- **반환 타입**: `any`로 받아서 타입 단언으로 풀어야 한다. 제네릭 래퍼를 만들면
  더 깔끔하지만, 호출 지점이 한두 군데면 그냥 단언이 편하다.

## 3단계 — 쓰기 시 무효화

기록이 바뀌면(생성/수정/삭제) 해당 카테고리 캐시를 날려야 한다.

```go
func (s *leaderboardService) CreateRecord(ctx context.Context, in CreateInput) error {
    record, err := s.repo.Create(ctx, in)
    if err != nil {
        return err
    }
    s.invalidate(ctx, record.Category)
    return nil
}

func (s *leaderboardService) UpdateRecord(ctx context.Context, id int, in UpdateInput) error {
    existing, err := s.repo.Get(ctx, id)
    if err != nil {
        return err
    }
    record, err := s.repo.Update(ctx, id, in)
    if err != nil {
        return err
    }
    // 카테고리가 바뀌었을 수도 있으니 둘 다 무효화
    s.invalidate(ctx, existing.Category)
    if record.Category != existing.Category {
        s.invalidate(ctx, record.Category)
    }
    return nil
}

func (s *leaderboardService) invalidate(ctx context.Context, category string) {
    if s.cache == nil || category == "" {
        return
    }
    _ = s.cache.Delete(ctx, category)
}
```

두 가지 디테일.

- **에러 무시**: 캐시 삭제 실패는 비즈니스 로직 실패가 아니다. 무효화에 실패하면
  다음 TTL 만료까지 stale 데이터가 보일 뿐이다. 그래서 `_ =`로 명시적으로 무시한다.
- **벌크 처리**: 벌크 업데이트는 영향받은 카테고리 집합을 모아서 한 번에 invalidate한다.
  카테고리별로 각각 호출하면 같은 카테고리를 N번 지우게 된다. set으로 묶는 게 낫다.

## 4단계 — Redis가 죽었을 때

Redis는 외부 의존성이므로 장애가 발생할 수 있다. Redis 장애 시 리더보드 API가 500을 반환해선 안 된다.

```go
func NewLeaderboardService(repo UserRepository, redisCli *redis.Client) LeaderboardService {
    var cache LeaderboardCache
    if redisCli != nil {
        if err := redisCli.Ping(context.Background()).Err(); err == nil {
            cache = NewLeaderboardCache(redisCli)
        } else {
            slog.Warn("redis unavailable; running without cache", "err", err)
        }
    }

    return &leaderboardService{cache: cache, repo: repo}
}

func (s *leaderboardService) getRanking(ctx context.Context, category string) ([]Entry, error) {
    if s.cache == nil {
        return s.calculateFromDB(ctx, category)
    }
    // … 기존 캐시 경로
}
```

`s.cache == nil` 일 때는 그냥 매번 DB에서 계산한다. 호출자 코드는 캐시 유무를 신경 쓰지 않는다.
Redis가 응답하지 않아도 서비스는 계속 동작하고, 단지 느려질 뿐이다.

## 정리

- **캐시는 객체가 아니라 결정의 결과를 담는 게 맞다.** "누가 몇 등인지"는 결정이고,
  "그 사용자의 닉네임"은 데이터다. 결정만 캐시에 담고 데이터는 매번 hydrate해야 무효화가 단순해진다.
- **singleflight의 double-check는 공짜로 추가되는 안전장치다.** 1차 체크와 동일한 코드를
  한 번 더 쓴다는 게 처음엔 어색해 보이지만, 캐시 갱신 직후의 레이스를 막는 가장 단순한 방법이다.
- **외부 의존은 nil 가능 인터페이스로 두면 graceful degradation이 쉬워진다.**
  fallback 분기를 if 한 줄로 끝낼 수 있다.
- **TTL은 안전망일 뿐이다.** 정확성은 invalidate가 보장하고, TTL은 invalidate가 누락될 때의
  백업이다. 데이터 변경 빈도와 stale 허용도를 보고 값을 정하면 된다.

규모가 더 커지면 `groupcache` 같은 read-through 라이브러리나 Redis sorted set 기반 사전 정렬 저장으로 갈 수 있다.
그 전까지는 ID 캐시 + hydration + singleflight + 카테고리 단위 invalidate 4단계만으로도 충분하다.
