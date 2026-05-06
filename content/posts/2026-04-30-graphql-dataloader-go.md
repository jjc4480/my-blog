---
title: "Go GraphQL DataLoader 직접 구현하기"
date: "2026-04-30"
published: false
category: "언어"
tags: ["Go", "graphql", "DataLoader", "performance", "concurrency"]
description: "GraphQL N+1 문제를 해결하는 DataLoader 패턴을 표준 라이브러리만으로 구현한다. batch, dedup, cache, request-scope까지 동작 원리를 코드로 정리한다."
---

## 배경

GraphQL을 쓰면 N+1 쿼리 문제가 자주 발생한다. 목록을 가져온 뒤 각 항목의
자식 자원을 같이 응답하려고 하면, 부모 N개가 있을 때 자식 조회가 N번 발생한다.

```graphql
query {
  users(first: 50) {
    edges {
      node {
        id
        name
        badges {     # 사용자별로 1번씩, 총 50번
          name
          tier
        }
      }
    }
  }
}
```

GraphQL 서버는 부모 자원에 대한 자식 필드 resolver를 독립적으로 호출하기 때문에,
자식 resolver에서 그냥 DB 쿼리를 부르면 50번 도는 게 자연스럽다.

DataLoader는 이 문제를 해결하는 패턴이다.
**"같은 요청 안에서 같은 종류의 자식 조회 호출을 모아서 한 번에 batch 처리하라"** 는 게 핵심.

이 글에서는 외부 DataLoader 라이브러리 없이 표준 라이브러리(`sync`, `time`, `context`)만으로
dataloader를 직접 짠다. 동작 원리를 이해하면 라이브러리를 가져다 쓸 때도 어디를 조심해야 할지 보인다.

## 요구사항

만들 dataloader는 이렇게 동작해야 한다.

1. **Batch**: 짧은 시간 동안(예: 1ms) 들어온 호출을 모아서 한 번에 fetch.
2. **Dedup**: 같은 요청에서 같은 키로 여러 번 호출되면 한 번만 fetch.
3. **Cache**: 같은 요청 안에서 같은 키 재호출은 캐시 히트.
4. **Request scope**: 요청이 끝나면 캐시는 사라져야 한다(메모리 누수와 stale 데이터 방지).
5. **Cancellation**: `ctx.Done()`이 닫히면 호출자가 즉시 빠져나올 수 있어야 한다.
6. **Race-free**: 동시에 여러 고루틴이 `Load`해도 안전.

## 구조

핵심 자료구조는 세 가지.

```go
type Loader[K comparable, V any] struct {
    config LoaderConfig[K, V]
    cache  map[K]V
    batch  *batch[K, V]
    mu     sync.Mutex
}

type batch[K comparable, V any] struct {
    keys     map[K]struct{}         // 이번 batch에 모인 키 (dedup)
    requests map[K][]*request[V]    // 키 → 대기 중인 요청들
}

type request[V any] struct {
    result V
    err    error
    done   chan struct{}             // 결과 도착 신호
}
```

- `batch.keys`는 set으로 dedup 역할.
- `batch.requests[key]`는 같은 키로 여러 호출자가 대기할 수 있도록 슬라이스.
- `request.done`은 결과 도착을 알리는 채널. close 한 번이면 모든 대기자가 깨어난다.

## Load — 호출 측 진입점

`Load`는 (1) 캐시 확인, (2) 배치에 등록, (3) 결과 대기를 한다.

```go
func (l *Loader[K, V]) Load(ctx context.Context, key K) (V, error) {
    var zero V

    l.mu.Lock()
    if cached, ok := l.cache[key]; ok {
        l.mu.Unlock()
        return cached, nil
    }

    if l.batch == nil {
        l.batch = &batch[K, V]{
            keys:     make(map[K]struct{}),
            requests: make(map[K][]*request[V]),
        }
        b := l.batch
        time.AfterFunc(l.config.Wait, func() {
            l.dispatch(ctx, b)
        })
    }

    req := &request[V]{done: make(chan struct{})}
    l.batch.keys[key] = struct{}{}
    l.batch.requests[key] = append(l.batch.requests[key], req)

    b := l.batch
    shouldDispatch := len(l.batch.keys) >= l.config.MaxBatch
    l.mu.Unlock()

    if shouldDispatch {
        l.dispatch(ctx, b)
    }

    select {
    case <-req.done:
        return req.result, req.err
    case <-ctx.Done():
        return zero, ctx.Err()
    }
}
```

세 가지 디테일.

- **`time.AfterFunc(Wait, dispatch)`**: 첫 키가 들어온 시점부터 타이머를 시작한다.
  이미 배치가 있으면 새로 만들지 않는다.
- **size-based dispatch**: 배치가 가득 차면(예: 100개) 타이머를 기다리지 않고 즉시 실행.
  큰 응답에서는 타이머만 기다리면 너무 느리기 때문에 둘 다 둔다.
- **`select`로 ctx 캔슬 우선 처리**: `req.done` 만 기다리면 요청이 취소돼도 fetch가
  끝날 때까지 묶여 있다. ctx와 함께 select 하면 즉시 빠져나올 수 있다.

## dispatch — 한 번만 실행되어야 한다

타이머 만료와 배치 사이즈 도달이 동시에 발생하면 둘 다 dispatch를 호출할 수 있다.
두 번 실행되면 같은 fetch가 중복 호출된다.

```go
func (l *Loader[K, V]) dispatch(ctx context.Context, b *batch[K, V]) {
    l.mu.Lock()
    if l.batch != b {       // 이미 다른 경로로 dispatch됐다
        l.mu.Unlock()
        return
    }
    l.batch = nil

    keys := make([]K, 0, len(b.keys))
    for k := range b.keys {
        keys = append(keys, k)
    }
    l.mu.Unlock()

    // Fetch는 lock 밖에서. lock을 잡고 외부 IO 하면 다른 호출이 다 막힌다.
    results, err := l.config.Fetch(ctx, keys)

    l.mu.Lock()
    defer l.mu.Unlock()
    for key, requests := range b.requests {
        result := results[key]
        if err == nil {
            l.cache[key] = result
        }
        for _, req := range requests {
            req.result = result
            req.err = err
            close(req.done)
        }
    }
}
```

핵심은 두 가지.

- **`l.batch != b` 가드**: 이미 dispatch된 배치는 다시 처리하지 않는다.
- **lock-fetch-lock 패턴**: fetch는 외부 호출이므로 lock을 풀고 한다.
  lock을 들고 fetch하면 다른 Load 호출이 모두 막힌다.

## Request scope — 미들웨어로 주입

dataloader는 **요청마다 새로 만든다**. 싱글턴으로 두면 요청 간 캐시가 섞여 stale 데이터가 남거나, 메모리가 계속 증가한다.

```go
type contextKey string

const loaderKey contextKey = "badge-loader"

func Middleware(svc BadgeService, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        loader := NewLoader(LoaderConfig[int, []Badge]{
            MaxBatch: 100,
            Wait:     time.Millisecond,
            Fetch:    svc.GetByUserIDs,
        })
        ctx := context.WithValue(r.Context(), loaderKey, loader)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

resolver에서는 다음과 같이 쓴다.

```go
func (r *userResolver) Badges(ctx context.Context, obj *User) ([]Badge, error) {
    loader, ok := ctx.Value(loaderKey).(*Loader[int, []Badge])
    if !ok {
        // 미들웨어 미부착 — fallback
        return r.svc.GetByUserIDs(ctx, []int{obj.ID})
    }
    return loader.Load(ctx, obj.ID)
}
```

## Service 쪽 batch fetch

dataloader가 호출하는 fetch 함수는 반드시 batch 단위로 받아 한 번의 쿼리로 풀어야 한다.
안에서 또 루프를 돌면 DataLoader 의미가 없다.

```go
func (s *badgeService) GetByUserIDs(ctx context.Context, userIDs []int) (map[int][]Badge, error) {
    if len(userIDs) == 0 {
        return map[int][]Badge{}, nil
    }
    badges, err := s.repo.ListByUserIDs(ctx, userIDs)
    if err != nil {
        return nil, err
    }
    out := make(map[int][]Badge, len(userIDs))
    for _, uid := range userIDs {
        out[uid] = []Badge{} // 누락 키도 빈 슬라이스 보장
    }
    for _, b := range badges {
        out[b.UserID] = append(out[b.UserID], b)
    }
    return out, nil
}
```

`out[uid] = []Badge{}`로 미리 채워두면, 결과에 없는 키는 `null` 대신 `[]`로 응답된다.

## 테스트

dataloader는 동시성 코드라 race 테스트를 포함해야 한다.

```go
func TestLoader_BatchAndDedup(t *testing.T) {
    var fetchCount atomic.Int32
    loader := NewLoader(LoaderConfig[int, string]{
        MaxBatch: 100,
        Wait:     5 * time.Millisecond,
        Fetch: func(ctx context.Context, keys []int) (map[int]string, error) {
            fetchCount.Add(1)
            out := make(map[int]string, len(keys))
            for _, k := range keys {
                out[k] = fmt.Sprintf("v%d", k)
            }
            return out, nil
        },
    })

    var wg sync.WaitGroup
    for i := range 50 {
        wg.Add(1)
        go func(k int) {
            defer wg.Done()
            v, err := loader.Load(context.Background(), k%10)
            if err != nil || v != fmt.Sprintf("v%d", k%10) {
                t.Errorf("key=%d err=%v v=%q", k, err, v)
            }
        }(i)
    }
    wg.Wait()

    if got := fetchCount.Load(); got != 1 {
        t.Errorf("fetch should run once, got %d", got)
    }
}
```

CI에서는 `go test -race -count=20 ./DataLoader/...`로 돌린다.
동시성 버그는 한 번 통과한다고 안전한 게 아니라 반복 실행으로 노출 가능성을 높인다.

## 정리

- **dataloader는 batch + dedup + cache + request-scope 네 가지가 모두 있어야 한다.**
  외부 라이브러리를 쓰든 직접 짜든 이 네 가지를 보장해야 한다.
- **lock 안에서 외부 IO 하지 않기.** dispatch에서 fetch는 lock을 풀고 한다.
- **size-based + time-based 둘 다 둬야 한다.** 하나만 있으면 어떤 케이스에서 지연이 길어진다.
- **request-scope는 미들웨어로 강제한다.** 싱글턴 DataLoader는 요청 간 캐시가 공유되어 stale 데이터와 메모리 누수를 유발한다.
- **fallback 경로를 만들어둔다.** 미들웨어가 안 붙은 환경에서도 죽지 않게.

`graph-gophers/DataLoader` 같은 라이브러리를 가져다 쓰면 위 동작이 잘 정리된 API로 제공된다.
다만 cache 유효 범위, dispatch 트리거 조건, ctx 캔슬 처리 등은 라이브러리마다 디테일이 다르니
한 번은 직접 짜보고 쓰는 걸 권한다.
