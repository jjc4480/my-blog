---
title: "GraphQL vs REST 2026: 논쟁 말고, 진짜 선택 기준"
date: "2026-04-24"
tags: ["GraphQL", "REST", "API", "architecture", "Backend"]
summary: "GraphQL이 REST보다 낫다는 논쟁은 끝났다. 지금은 언제 무엇을 쓸지가 질문이다. 과도한 패칭, 복수 클라이언트, N+1 비용을 중심으로 2026년 기준 선택 기준을 정리한다."
---

2019년에는 "GraphQL이 REST를 대체할 것"이라는 글이 많았다. 2026년에는 그런 글이 거의 없다. 두 방식 모두 자리를 잡았고, 싸움이 끝났다는 뜻이 아니라 논점이 바뀌었다는 뜻이다. 이제 질문은 "무엇이 더 좋은가"가 아니라 "내 상황에서 무엇을 써야 하는가"다.

## REST가 여전히 맞는 경우

REST의 강점은 HTTP 위에 그대로 얹힌다는 점이다. 브라우저, CDN, 프록시가 GET 요청을 캐싱하는 방식 그대로 동작한다.

**단순 CRUD:** 데이터 모델이 단순하고 엔드포인트가 직관적이면 REST가 더 빠르다. 리소스 하나를 만들고 읽고 업데이트하고 삭제하는 서비스에 GraphQL 스키마를 도입하면 오버엔지니어링이다.

**공개 API:** 서드파티 개발자에게 공개하는 API라면 REST가 표준에 가깝다. OpenAPI 명세, Swagger UI, Postman 컬렉션 공유 등 생태계가 성숙해 있다. GraphQL은 진입 장벽이 있고 도구 지원이 불균일하다.

**HTTP 캐싱이 중요한 서비스:** CDN 레이어에서 정적 데이터를 캐싱해야 한다면 REST가 유리하다.

```
// REST: HTTP 캐싱 헤더 그대로 활용
GET /api/v1/products
Cache-Control: public, max-age=3600
ETag: "abc123"

// GraphQL: POST로 보내기 때문에 HTTP 캐싱 기본 안 됨
// Persisted Query 혹은 GET 방식의 별도 설정 필요
```

**파일 업로드:** REST는 `multipart/form-data`로 파일을 자연스럽게 처리한다. GraphQL에서 파일 업로드는 별도 spec(`graphql-multipart-request-spec`)이 필요하고, 구현이 번거롭다.

## GraphQL이 진짜 가치를 발휘하는 경우

GraphQL이 REST를 압도하는 상황은 분명히 있다. 클라이언트가 요청 데이터의 형태를 결정해야 할 때다.

### 복수 클라이언트: 모바일 vs 웹

같은 엔드포인트에서 다른 양의 데이터가 필요한 상황이다.

```graphql
# 모바일: 목록 카드 렌더링에 필요한 것만
query MobileFeed {
  feed(limit: 10) {
    id
    title
    author { name }
    thumbnailUrl
  }
}

# 웹: 상세 페이지에서 모든 관련 데이터
query WebFeed {
  feed(limit: 20) {
    id
    title
    content
    publishedAt
    author {
      name
      avatar
      bio
    }
    tags
    commentCount
    relatedPosts { id title }
  }
}
```

REST에서 이 문제를 해결하려면 `?fields=id,title,author` 같은 쿼리 파라미터로 필드 필터링을 직접 구현하거나, 모바일용/웹용 엔드포인트를 따로 만들어야 한다. 둘 다 GraphQL이 기본 제공하는 것을 수동으로 구축하는 셈이다.

### 오버패칭의 실제 비용

사용자 목록을 보여주는데 응답에 `address`, `preferences`, `activityLog` 같은 필드가 딸려 온다. 모바일 데이터를 쓰는 사용자에게는 직접적인 손해다.

Shopify는 모바일 앱을 GraphQL로 전환한 후 API 응답 크기를 최대 75% 줄였다고 발표했다. 숫자는 도메인마다 다르지만, 언더패칭(필요한 데이터를 얻기 위한 다중 요청)과 오버패칭(불필요한 데이터 전송) 모두 GraphQL이 구조적으로 해결한다.

### 복잡한 중첩 관계 데이터

소셜 피드, 커머스 상품 페이지, 대시보드처럼 하나의 화면에 여러 도메인 데이터가 필요한 경우다.

REST에서는 `GET /users/:id`, `GET /users/:id/posts`, `GET /posts/:id/comments`를 순서대로 호출하거나, 전용 집계 엔드포인트를 만들어야 한다. GraphQL에서는 한 번의 쿼리로 처리한다.

```graphql
query UserDashboard($userId: ID!) {
  user(id: $userId) {
    name
    email
    recentPosts(limit: 5) {
      title
      viewCount
      comments(limit: 3) {
        text
        author { name }
      }
    }
    notifications(unreadOnly: true) {
      message
      createdAt
    }
  }
}
```

## GraphQL의 숨겨진 비용

GraphQL을 선택하기 전에 반드시 따져봐야 할 것들이다.

### N+1 쿼리 문제

GraphQL의 가장 큰 함정이다. resolver(resolver)가 부모 데이터를 받아서 자식을 조회하는 구조 때문에, 쿼리 하나가 N+1개의 DB 쿼리를 유발한다.

```javascript
// 이 쿼리는 N+1 문제를 일으킨다
// posts 10개 → 각 post.author 조회 10번 = 총 11번 쿼리
const resolvers = {
  Post: {
    author: (post) => db.user.findById(post.authorId) // N번 실행
  }
}

// DataLoader로 해결: 같은 이벤트 루프에서 발생한 요청을 배치 처리
import DataLoader from 'dataloader'

const userLoader = new DataLoader(async (ids) => {
  const users = await db.user.findMany({ where: { id: { in: ids } } })
  return ids.map(id => users.find(u => u.id === id))
})

const resolvers = {
  Post: {
    author: (post) => userLoader.load(post.authorId) // 배치로 묶임
  }
}
```

DataLoader로 해결은 되지만, 이걸 모든 resolver에 적용해야 한다. 팀이 인지하지 못하면 프로덕션에서 쿼리 폭발을 만날 수 있다.

### HTTP 캐싱 불가

GraphQL은 단일 엔드포인트에 POST로 쿼리를 보낸다. CDN이 POST 바디를 기준으로 캐싱하지 않기 때문에, 같은 데이터를 요청해도 매번 서버까지 도달한다. Persisted Query나 GET 방식으로 캐싱을 구현할 수 있지만, 추가 설정이 필요하다.

### 스키마 관리 오버헤드

스키마가 성장하면 관리 비용이 따라온다. 더 이상 쓰지 않는 필드를 제거하면 기존 클라이언트가 깨진다. deprecated 처리하고 마이그레이션 기간을 관리해야 한다. 팀 규모가 작으면 이 오버헤드가 REST 유지보수보다 클 수 있다.

### 쿼리 복잡도 제한 필요

클라이언트가 이런 쿼리를 보낼 수 있다:

```graphql
# 실수 또는 악의적으로 깊은 쿼리
query {
  users {
    posts {
      comments {
        author {
          posts {
            comments { author { posts { ... } } }
          }
        }
      }
    }
  }
}
```

서버가 무한 중첩 쿼리를 처리하다가 다운된다. 쿼리 복잡도 제한(query complexity limit)과 깊이 제한을 반드시 설정해야 한다.

## 2026년 현황: tRPC의 등장

풀스택 TypeScript 프로젝트에서 tRPC가 빠르게 퍼지고 있다. REST처럼 엔드포인트를 정의하지만, 스키마 없이 TypeScript 타입이 클라이언트까지 자동으로 흐른다.

```typescript
// tRPC: 서버에서 프로시저 정의
const appRouter = router({
  user: router({
    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(({ input, ctx }) => ctx.db.user.findUnique({ where: { id: input.id } })),
    
    create: protectedProcedure
      .input(CreateUserSchema)
      .mutation(({ input, ctx }) => ctx.db.user.create({ data: input })),
  }),
})

// 클라이언트: 별도 타입 선언 없이 자동 완성 + 타입 체크
const user = await trpc.user.getById.query({ id: '123' })
// user의 타입은 서버 DB 쿼리 결과에서 자동으로 추론됨
```

tRPC는 백엔드와 프론트엔드를 같은 팀이 관리하는 경우에 한해 REST와 GraphQL의 중간 지점을 채운다. 서드파티 API, 다른 언어 클라이언트, 외부 공개 API에는 쓸 수 없다.

GraphQL Federation은 엔터프라이즈에서 계속 채택이 늘고 있다. 팀마다 독립적으로 서브그래프를 관리하고, Gateway에서 통합하는 방식이다. 마이크로서비스 환경에서 BFF(Backend for Frontend) 없이 클라이언트에 단일 GraphQL 인터페이스를 제공하려는 곳에서 선택한다.

## 결정 트리

세 가지 질문으로 결론을 낼 수 있다.

**1. 클라이언트가 하나인가, 여럿인가?**

클라이언트가 하나(웹만 또는 앱만)이고 팀이 API 응답 형태를 통제한다면 REST로 충분하다. 클라이언트가 여러 종류이거나, 파트너 API를 통해 외부에서 불규칙하게 접근한다면 GraphQL을 검토한다.

**2. 오버패칭/언더패칭이 실제 문제인가?**

응답 데이터의 일부만 쓰이고 있거나, 화면 하나를 위해 여러 API를 순차 호출하고 있다면 GraphQL이 해결책이다. 데이터 구조가 단순하고 응답 전체를 쓴다면 REST가 맞다.

**3. 팀이 GraphQL 비용을 감당할 수 있는가?**

N+1 처리, 캐싱 전략, 쿼리 복잡도 제한, 스키마 관리 모두 초기 설정과 지속적인 관리가 필요하다. 팀 규모가 작거나 초기 단계 프로덕트라면 REST로 빠르게 시작하고 필요할 때 전환하는 편이 낫다.

| 상황 | 추천 |
|---|---|
| 단순 CRUD, 팀 1개 | REST |
| 공개 API, 외부 개발자 대상 | REST |
| HTTP 캐싱 / CDN 의존 | REST |
| 파일 업로드 | REST |
| 풀스택 TypeScript, 내부 API | tRPC |
| 모바일+웹+파트너 복수 클라이언트 | GraphQL |
| 오버패칭이 실제 비용 | GraphQL |
| 복잡한 중첩 관계 데이터 | GraphQL |
| 마이크로서비스 통합 API | GraphQL Federation |

## 결론

REST로 시작하는 게 맞다. 대부분의 서비스는 REST로 충분하고, 도입 비용이 낮다. GraphQL이 가치를 발휘하는 시점은 복수 클라이언트가 생기거나, 오버패칭이 실제 비용으로 측정될 때다. 그때 전환하면 된다. 처음부터 GraphQL을 선택해야 하는 경우는 이미 그 상황임을 알고 있을 때뿐이다.

---

## 참고 자료

- [GraphQL vs REST in 2026 — Bart Zalewski](https://www.bartzalewski.com/blog/graphql-vs-rest-2026) — 실전 코드 중심 비교
- [GraphQL vs REST API Design 2026 — JishuLabs](https://jishulabs.com/blog/graphql-vs-rest-api-design-2026) — 성능 최적화 패턴 포함 종합 비교
- [tRPC 공식 문서](https://trpc.io) — TypeScript 풀스택에서의 대안 접근
