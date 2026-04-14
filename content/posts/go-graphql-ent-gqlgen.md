---
title: 'Go GraphQL 스택: ent + gqlgen + entgql로 코드 생성 중심 API 만들기'
date: 2026-04-14
description: ent ORM과 gqlgen을 entgql로 연결해서 GraphQL API를 코드 생성 기반으로 구축하는 방법. Relay Connection 패턴까지.
tags: [go, graphql, ent, gqlgen, code-generation]
slug: go-graphql-ent-gqlgen
category: engineering
published: false
---

> **한 줄 요약:** ent 스키마 하나 정의하면 DB 마이그레이션, GraphQL 스키마, Relay 페이지네이션까지 자동 생성된다. 보일러플레이트를 줄이는 대신 생성 코드에 대한 이해가 필요하다.

GraphQL API를 Go로 만들 때 가장 귀찮은 건 반복 코드다. DB 스키마 정의하고, GraphQL 스키마 정의하고, resolver 작성하고, 페이지네이션 로직 구현하고. 타입 하나 추가할 때마다 네 곳을 고쳐야 한다.

ent, gqlgen, entgql 조합은 이 문제를 **코드 생성**으로 해결한다. ent 스키마 하나만 정의하면 나머지가 자동으로 따라온다. 이 글에서는 각 도구의 역할과 연결 방식, 그리고 Relay Connection 기반 페이지네이션까지 다룬다.

## 세 가지 도구, 각자의 역할

### ent: 스키마가 곧 코드

[ent](https://entgo.io)는 Go용 엔티티 프레임워크다. GORM이나 sqlx와 달리 **스키마를 Go 코드로 정의**하고, 거기서 타입 안전한 CRUD 코드를 생성한다.

```go
// ent/schema/todo.go
package schema

import (
    "time"

    "entgo.io/ent"
    "entgo.io/ent/schema/edge"
    "entgo.io/ent/schema/field"
)

type Todo struct {
    ent.Schema
}

func (Todo) Fields() []ent.Field {
    return []ent.Field{
        field.Text("text").NotEmpty(),
        field.Time("created_at").Default(time.Now).Immutable(),
        field.Enum("status").
            Values("IN_PROGRESS", "COMPLETED").
            Default("IN_PROGRESS"),
        field.Int("priority").Default(0),
    }
}

func (Todo) Edges() []ent.Edge {
    return []ent.Edge{
        edge.To("children", Todo.Type).
            From("parent").
            Unique(),
    }
}
```

`go generate`를 실행하면 `ent/` 디렉토리에 타입 안전한 클라이언트 코드가 생성된다. `client.Todo.Create().SetText("할 일").Save(ctx)` 같은 빌더 패턴으로 DB를 조작한다. SQL을 직접 쓸 일이 거의 없다.

핵심은 **스키마가 단일 진실 공급원(Single Source of Truth)**이라는 점이다. 필드 타입, 유효성 검사, 관계. 모든 게 이 스키마 파일에서 나온다.

### gqlgen: 스키마 퍼스트 GraphQL

[gqlgen](https://gqlgen.com)은 Go의 GraphQL 서버 라이브러리다. graphql-go나 다른 대안도 있지만, gqlgen이 Go 생태계에서 사실상 표준이다.

핵심 특징:
- **스키마 퍼스트:** `.graphql` 파일에 스키마를 먼저 정의하고, 거기서 Go 코드를 생성한다
- **타입 안전:** 생성된 resolver 인터페이스가 컴파일 타임에 타입을 보장한다
- **autobind:** Go 타입과 GraphQL 타입이 이름이 같으면 자동으로 바인딩된다

```yaml
# gqlgen.yml
schema:
  - ent.graphql
  - todo.graphql

resolver:
  layout: follow-schema
  dir: .

autobind:
  - myapp/ent
  - myapp/ent/todo

models:
  ID:
    model:
      - github.com/99designs/gqlgen/graphql.IntID
  Node:
    model:
      - myapp/ent.Noder
```

### entgql: 둘을 잇는 브릿지

[entgql](https://pkg.go.dev/entgo.io/contrib/entgql)은 ent와 gqlgen 사이의 접착제다. ent 스키마에 어노테이션을 붙이면:

1. ent 스키마에서 **GraphQL 스키마를 자동 생성**한다
2. Relay Node 인터페이스를 구현한다
3. Relay Connection (cursor-based pagination)을 자동 생성한다
4. 필드 컬렉션으로 N+1 문제를 해결한다
5. 트랜잭셔널 뮤테이션을 지원한다

한마디로, ent 스키마 하나만 잘 정의하면 GraphQL API의 뼈대가 통째로 나온다.

## 실전: 프로젝트 셋업

### 1단계: ent 스키마에 GraphQL 어노테이션 추가

```go
// ent/schema/todo.go
func (Todo) Annotations() []schema.Annotation {
    return []schema.Annotation{
        entgql.RelayConnection(),
        entgql.QueryField(),
        entgql.Mutations(entgql.MutationCreate()),
    }
}
```

`entgql.RelayConnection()`이 핵심이다. 이 한 줄로 `TodoConnection`, `TodoEdge`, `PageInfo` 타입이 자동 생성된다.

`entgql.QueryField()`는 Query 타입에 `todos` 필드를 추가하고, `entgql.Mutations(entgql.MutationCreate())`는 `createTodo` 뮤테이션을 만든다.

### 2단계: entgql 확장 설정

```go
// ent/entc.go
//go:build ignore

package main

import (
    "log"

    "entgo.io/contrib/entgql"
    "entgo.io/ent/entc"
    "entgo.io/ent/entc/gen"
)

func main() {
    ex, err := entgql.NewExtension(
        entgql.WithSchemaGenerator(),
        entgql.WithSchemaPath("ent.graphql"),
        entgql.WithConfigPath("gqlgen.yml"),
    )
    if err != nil {
        log.Fatalf("creating entgql extension: %v", err)
    }
    if err := entc.Generate("./ent/schema", &gen.Config{},
        entc.Extensions(ex),
    ); err != nil {
        log.Fatalf("running ent codegen: %v", err)
    }
}
```

`WithSchemaGenerator()`가 ent 스키마를 읽어서 `ent.graphql` 파일을 생성한다. `WithConfigPath`로 gqlgen 설정 파일 위치를 알려주면, 코드 생성 시 gqlgen과의 타입 바인딩도 자동으로 처리된다.

### 3단계: 코드 생성 실행

```go
// generate.go
package myapp

//go:generate go run -mod=mod ./ent/entc.go
//go:generate go run -mod=mod github.com/99designs/gqlgen
```

```bash
go generate .
```

이 한 번의 명령으로:
- ent가 DB 클라이언트 코드를 생성하고
- entgql이 GraphQL 스키마(`ent.graphql`)를 생성하고
- gqlgen이 resolver 인터페이스와 타입 바인딩 코드를 생성한다

### 4단계: Resolver 구현

생성된 resolver는 거의 한 줄이다.

```go
// ent.resolvers.go
func (r *queryResolver) Todos(
    ctx context.Context,
    after *ent.Cursor, first *int,
    before *ent.Cursor, last *int,
    orderBy *ent.TodoOrder,
) (*ent.TodoConnection, error) {
    return r.client.Todo.Query().
        Paginate(ctx, after, first, before, last,
            ent.WithTodoOrder(orderBy),
        )
}
```

페이지네이션, 정렬, 커서 처리. 전부 `Paginate` 메서드 하나에 담겨 있다. 직접 구현했다면 수백 줄은 됐을 로직이다.

뮤테이션도 마찬가지:

```go
func (r *mutationResolver) CreateTodo(
    ctx context.Context, input ent.CreateTodoInput,
) (*ent.Todo, error) {
    return r.client.Todo.Create().SetInput(input).Save(ctx)
}
```

`SetInput`이 GraphQL input 타입의 모든 필드를 ent 빌더에 자동으로 매핑한다.

## Relay Connection: 왜 cursor인가

### offset의 한계

전통적인 페이지네이션은 `LIMIT 20 OFFSET 40` 같은 방식이다. 간단하지만 문제가 있다.

- **데이터 변경에 취약하다.** 2페이지를 보는 도중 새 데이터가 추가되면 3페이지에서 이전에 본 항목이 다시 나온다
- **성능이 선형 저하된다.** `OFFSET 10000`은 DB가 10000행을 읽고 버린다는 뜻이다
- **무한 스크롤에 부적합하다.** 모바일 앱이나 실시간 피드에서는 "몇 페이지"라는 개념 자체가 맞지 않다

### cursor 기반 페이지네이션

Relay Connection 스펙은 cursor를 기준으로 "이 지점 이후의 N개"를 요청하는 방식이다.

```graphql
query {
  todos(first: 10, after: "opaqueCursor", orderBy: {direction: DESC, field: CREATED_AT}) {
    edges {
      node {
        id
        text
        status
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
```

각 `edge`는 `node`(실제 데이터)와 `cursor`(해당 위치의 불투명 토큰)를 가진다. `pageInfo`는 다음/이전 페이지 존재 여부와 경계 커서를 알려준다.

DB 쿼리로 보면 `WHERE id > cursor_id ORDER BY id LIMIT 10` 형태다. 인덱스를 타기 때문에 offset처럼 앞의 데이터를 전부 스캔할 필요가 없다.

| | Offset | Cursor |
|---|---|---|
| 구현 난이도 | 쉽다 | 상대적으로 복잡하다 |
| 데이터 변경 시 | 중복/누락 발생 | 안정적 |
| 대량 데이터 | 느려진다 (O(n)) | 일정한 속도 |
| 특정 페이지 이동 | 가능 | 불가 (순차 탐색만) |
| 무한 스크롤 | 부적합 | 적합 |

### entgql이 자동 생성하는 것들

ent 스키마에 `entgql.RelayConnection()`을 붙이면, 다음이 자동으로 만들어진다:

**GraphQL 타입:**
```graphql
type TodoConnection {
  edges: [TodoEdge]
  pageInfo: PageInfo!
  totalCount: Int!
}

type TodoEdge {
  node: Todo
  cursor: Cursor!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: Cursor
  endCursor: Cursor
}
```

**Go 코드:**
- `ent.TodoConnection` 구조체
- `ent.TodoEdge` 구조체
- `ent.Cursor` 타입
- `Todo.Query().Paginate()` 메서드
- 정렬 옵션 (`ent.WithTodoOrder`)

직접 구현하면 타입 정의, 커서 인코딩/디코딩, 쿼리 빌딩, 정렬 처리 등을 전부 작성해야 한다. entgql은 이걸 어노테이션 한 줄로 끝낸다.

### 정렬 필드 추가

정렬 가능한 필드는 어노테이션으로 지정한다:

```go
func (Todo) Fields() []ent.Field {
    return []ent.Field{
        field.Text("text").NotEmpty().
            Annotations(entgql.OrderField("TEXT")),
        field.Time("created_at").Default(time.Now).Immutable().
            Annotations(entgql.OrderField("CREATED_AT")),
        field.Enum("status").Values("IN_PROGRESS", "COMPLETED").
            Annotations(entgql.OrderField("STATUS")),
        field.Int("priority").Default(0).
            Annotations(entgql.OrderField("PRIORITY")),
    }
}
```

이렇게 하면 `orderBy: {direction: DESC, field: PRIORITY}` 같은 정렬이 바로 동작한다. 다만 정렬 필드에는 DB 인덱스를 반드시 걸어야 한다. 안 그러면 풀 테이블 스캔이다.

## N+1 문제 해결

GraphQL의 고질적 문제인 N+1을 entgql은 **필드 컬렉션**으로 해결한다. 클라이언트가 요청한 필드를 분석해서, 필요한 edge를 자동으로 eager-loading한다.

```graphql
query {
  todos(first: 100) {
    edges {
      node {
        text
        children {
          text
        }
      }
    }
  }
}
```

이 쿼리를 실행하면 entgql이 내부적으로 `WithChildren()` eager-load를 추가한다. 결과적으로 DB 쿼리는 2개다. todo 목록 1번, children 목록 1번. DataLoader 없이 N+1이 해결된다.

## 트랜잭셔널 뮤테이션

entgql은 GraphQL 뮤테이션을 자동으로 트랜잭션으로 감쌀 수 있다.

```go
srv := handler.NewDefaultServer(todo.NewSchema(client))
srv.Use(entgql.Transactioner{TxOpener: client})
```

이 한 줄이면 모든 뮤테이션이 트랜잭션 안에서 실행된다. resolver에서 에러가 발생하면 자동 롤백. resolver 코드에서 트랜잭션을 직접 관리할 필요가 없다.

```go
func (r *mutationResolver) CreateTodo(ctx context.Context, input ent.CreateTodoInput) (*ent.Todo, error) {
    client := ent.FromContext(ctx)
    return client.Todo.Create().SetInput(input).Save(ctx)
}
```

`ent.FromContext(ctx)`로 트랜잭션 클라이언트를 꺼내서 쓰면 된다.

## 코드 생성의 트레이드오프

| | 장점 | 단점 |
|---|---|---|
| 보일러플레이트 | 페이지네이션, CRUD, 타입 매핑 자동 생성 | 생성 코드가 수천 줄. 이해하려면 시간 투자 필요 |
| 타입 안전성 | 컴파일 타임에 잡히는 오류가 많다 | — |
| 일관성 | 모든 엔티티가 같은 패턴을 따른다 | 특수한 케이스에서 패턴을 깨기 어렵다 |
| 스키마 동기화 | DB↔GraphQL 스키마가 항상 일치 | ent 스키마에 의존적. ent를 벗어나면 수동 관리 |
| 러닝커브 | 패턴을 익히면 생산성이 높다 | ent + gqlgen + entgql 세 도구를 동시에 이해해야 한다 |
| 디버깅 | — | 생성 코드 안에서 버그가 터지면 추적이 어렵다 |
| 커스터마이징 | — | 기본 패턴에서 벗어나는 요구사항은 우회가 필요하다 |

코드 생성은 **80%의 케이스를 자동화하되, 20%의 예외를 처리하는 비용**이 존재한다. ent + gqlgen + entgql 조합은 CRUD 중심의 API에서는 생산성이 압도적이다. 하지만 복잡한 비즈니스 로직이 resolver에 많이 들어가거나, GraphQL 스키마를 세밀하게 제어해야 하는 경우에는 생성 코드와의 싸움이 시작된다.

프로젝트 초기에 이 스택을 선택할 때의 기준:
- **엔티티가 10개 이상이고 CRUD가 대부분이다** → 강력 추천
- **복잡한 커스텀 resolver가 많다** → gqlgen만 쓰는 게 나을 수 있다
- **팀이 ent에 익숙하지 않다** → 러닝커브 감안하고 시작하거나, 작은 서비스에서 먼저 시도

## 전체 흐름 요약

```
ent 스키마 정의
    ↓ go generate
ent 클라이언트 코드 생성 (CRUD, 마이그레이션)
    ↓ entgql
GraphQL 스키마 자동 생성 (ent.graphql)
    ↓ gqlgen
Resolver 인터페이스 + 타입 바인딩 생성
    ↓
Resolver 구현 (대부분 1~3줄)
```

스키마 하나가 DB부터 API까지 관통한다. divide and conquer의 전형적인 예다. 각 도구가 자기 영역만 책임지고, 어노테이션으로 연결한다. 모듈 간 경계가 명확하기 때문에 한 도구를 교체해도 다른 도구에 미치는 영향이 최소화된다.

## 참고 자료

- [ent GraphQL Integration](https://entgo.io/docs/graphql/) — ent 공식 문서의 GraphQL 통합 가이드
- [Relay Cursor Connections (Pagination)](https://entgo.io/docs/tutorial-todo-gql-paginate/) — entgql 기반 Relay 페이지네이션 튜토리얼
- [ent GraphQL Tutorial - Introduction](https://entgo.io/docs/tutorial-todo-gql/) — ent + gqlgen 셋업부터 뮤테이션까지 전체 흐름
- [Relay Cursor Connections Specification](https://relay.dev/graphql/connections.htm) — Relay Connection 스펙 원문
