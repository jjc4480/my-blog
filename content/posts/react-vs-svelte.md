---
title: 'React vs Svelte: 반응성, 성능, 생태계 비교'
date: 2026-04-15
description: React 19와 Svelte 5를 반응성 모델, 컴포넌트 작성 방식, 런타임 성능, 생태계 네 가지 축으로 비교한다.
tags: [react, svelte, frontend, comparison]
slug: react-vs-svelte
category: engineering
published: true
---

프론트엔드 프레임워크를 고를 때 "뭐가 더 좋은가"라는 질문은 의미가 없다. 중요한 건 "이 프로젝트에서 뭐가 더 맞는가"다. React은 2013년부터 쌓아온 거대한 생태계가 있고, Svelte는 컴파일러 기반이라 접근 자체가 다르다.

이 글에서는 React 19와 Svelte 5를 네 가지 축으로 비교한다. 반응성 모델, 컴포넌트 작성 체감, 런타임 성능, 그리고 생태계.

## 반응성 모델

프레임워크의 성격을 가장 잘 드러내는 부분이 반응성 모델이다. 상태가 바뀌었을 때 화면을 어떻게 다시 그리는가. React과 Svelte는 이 질문에 정반대의 답을 내놓는다.

### React: 런타임에서 해결한다

React은 상태가 변하면 컴포넌트 함수를 통째로 다시 실행한다. 그리고 이전 화면과 새 화면을 비교해서, 실제로 바뀐 부분만 반영한다. 이걸 가상 DOM 방식이라고 한다.

```jsx
import { useState, useEffect, useMemo } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  const doubled = useMemo(() => count * 2, [count])

  useEffect(() => {
    console.log(`count: ${count}`)
    return () => console.log('cleanup')
  }, [count])

  return (
    <div>
      <p>Count: {count}</p>
      <p>Doubled: {doubled}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  )
}
```

상태는 `useState`, 계산된 값은 `useMemo`, 부가 동작은 `useEffect`. 각 훅마다 "이 값이 바뀔 때만 실행해"라는 의존성 배열(`[count]`)을 직접 넣어줘야 한다. 이걸 빠뜨리거나 잘못 넣으면 무한 루프가 돌거나 업데이트가 안 된다. React에서 가장 흔한 실수다.

### Svelte 5: 컴파일러가 해결한다

Svelte는 접근이 다르다. 가상 DOM이 없다. 빌드할 때 컴파일러가 "이 변수가 바뀌면 화면의 어느 부분을 고쳐야 하는지" 미리 파악해서, 딱 필요한 코드만 만들어둔다.

```svelte
<script>
  let count = $state(0)
  let doubled = $derived(count * 2)

  $effect(() => {
    console.log(`count: ${count}`)
    return () => console.log('cleanup')
  })
</script>

<div>
  <p>Count: {count}</p>
  <p>Doubled: {doubled}</p>
  <button onclick={() => count++}>+1</button>
</div>
```

`$state`로 선언한 변수는 그냥 `count++`로 바꾸면 된다. `$derived`는 어떤 값에 의존하는지 알아서 추적한다. `$effect`도 마찬가지. "이 값이 바뀔 때"를 직접 적어줄 필요가 없다.

### 핵심 차이

| | React 19 | Svelte 5 |
|---|---|---|
| 반응성 시점 | 런타임 | 컴파일 타임 |
| 상태 변경 | `setState(newVal)` | `val = newVal` |
| 파생값 | `useMemo(fn, deps)` | `$derived(expr)` |
| 사이드 이펙트 | `useEffect(fn, deps)` | `$effect(fn)`, 자동 추적 |
| 가상 DOM | 사용 | 없음 |
| 의존성 관리 | 수동 (배열) | 자동 |

React의 훅은 강력하지만, "올바르게 쓰기"가 어렵다. 의존성 배열 관리, 값이 예전 것으로 잡히는 문제, 불필요한 다시 그리기를 막기 위한 최적화 코드. 이런 것들이 React 코드의 상당 부분을 차지한다. 실제 기능이 아니라 프레임워크를 달래는 코드인 셈이다.

Svelte는 이 문제를 컴파일러에게 넘긴다. 개발자가 의존 관계를 직접 적을 필요가 없으니 실수할 여지도 줄어든다. 대신 "컴파일러가 내 코드를 어떻게 바꾸는지" 이해해야 하는 새로운 학습 포인트가 생긴다.

## 컴포넌트 작성 체감 차이

같은 기능을 만들 때 코드가 얼마나 다른지 직접 비교해본다.

### 사용자 카드 컴포넌트

**React:**

```jsx
import { useState } from 'react'

function UserCard({ name, email, role }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card">
      <h2>{name}</h2>
      <p>{email}</p>
      {expanded && <p className="role">{role}</p>}
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? '접기' : '펼치기'}
      </button>
    </div>
  )
}
```

**Svelte 5:**

```svelte
<script>
  let { name, email, role } = $props()
  let expanded = $state(false)
</script>

<div class="card">
  <h2>{name}</h2>
  <p>{email}</p>
  {#if expanded}
    <p class="role">{role}</p>
  {/if}
  <button onclick={() => expanded = !expanded}>
    {expanded ? '접기' : '펼치기'}
  </button>
</div>

<style>
  .card { padding: 1rem; border-radius: 8px; }
  .role { color: gray; }
</style>
```

눈에 띄는 차이가 몇 가지 있다.

**JSX vs 템플릿.** React은 JavaScript 안에 HTML을 쓴다(JSX). `className`, `htmlFor` 같은 React 전용 속성명을 써야 하고, 조건부 렌더링은 삼항 연산자나 `&&`로 처리한다. Svelte는 HTML 안에 JavaScript를 쓴다. `class`, `for`를 그대로 쓰고, `{#if}`/`{#each}` 같은 블록 문법으로 제어 흐름을 표현한다.

**스타일 격리.** Svelte는 `<style>` 블록에 쓴 CSS가 해당 컴포넌트에만 자동으로 적용된다. 별도 라이브러리나 설정이 필요 없다. React은 CSS가 다른 컴포넌트에 영향을 주지 않도록 하는 방법을 직접 골라야 한다.

**Props.** React은 함수 매개변수로 받고, Svelte 5는 `$props()` rune으로 구조분해한다. 큰 차이는 아니지만 Svelte 쪽이 더 명시적이다.

### 보일러플레이트

리스트 렌더링을 비교하면 코드량 차이가 드러난다.

```jsx
// React
function UserList({ users }) {
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>
          <UserCard {...user} />
        </li>
      ))}
    </ul>
  )
}
```

```svelte
<!-- Svelte 5 -->
<script>
  let { users } = $props()
</script>

<ul>
  {#each users as user (user.id)}
    <li><UserCard {...user} /></li>
  {/each}
</ul>
```

React은 `map`과 `key` prop이 필수다. `key`를 빠뜨리면 경고가 뜨고, 리스트 성능에도 영향을 준다. Svelte는 `{#each}` 블록의 괄호 안에 키를 넣는다. 문법적으로 더 간결하고, 빼먹기 어렵다.

전반적으로 같은 기능을 구현할 때 Svelte 코드가 20~30% 더 짧다. 이 차이는 프로젝트가 커질수록 누적된다. 다만 "코드가 짧다 = 더 좋다"는 아니다. React의 명시적 패턴이 팀 단위에서는 더 읽기 쉬울 수 있다.

### 학습 곡선

React이 더 어려운 이유는 명확하다.

- JSX 문법이 HTML과 미묘하게 다르다 (`className`, self-closing 태그 등)
- 훅에는 지켜야 할 규칙이 있다. 조건문이나 반복문 안에서 훅을 호출하면 안 된다.
- 객체나 배열을 직접 수정하면 화면이 안 바뀐다. 항상 새 객체를 만들어서 넣어줘야 한다.
- 외부 라이브러리 선택 부담이 크다. 라우터, 상태관리, 폼 처리 등 직접 골라야 한다.

Svelte는 일반 HTML/CSS/JS에 가깝다. 웹 기초 지식이 있으면 진입 장벽이 낮다. `$state`, `$derived` 같은 rune 문법만 익히면 대부분의 패턴을 다룰 수 있다. 애니메이션, 트랜지션, 스토어가 빌트인으로 포함되어 있어서 "뭘 설치해야 하지"를 고민할 일도 적다.

## 번들 사이즈 & 런타임 성능

### 접근 방식의 차이

React은 브라우저에서 프레임워크 코드가 함께 돌아간다. 화면 비교 엔진이 상시 동작하면서 UI를 관리한다. 이 코드만 약 42KB. 앱 코드와 별개로 반드시 다운로드해야 한다.

Svelte는 빌드할 때 컴포넌트를 일반 JavaScript로 변환한다. 브라우저에서 별도 프레임워크가 돌아갈 필요가 없다. 전달되는 건 화면을 직접 조작하는 코드뿐이다.

### 번들 사이즈

| 구성 | React 19 | Svelte 5 |
|---|---|---|
| 코어 런타임 | ~42 KB | 0 KB |
| 라우터 | +15 KB (React Router) | +8 KB (SvelteKit 내장) |
| 상태관리 | +12 KB (Zustand 등) | 내장 |
| 총합 | ~72 KB | ~28 KB |
| 실제 앱 | 200~300 KB | 50~100 KB |

Svelte 앱이 다운로드해야 하는 코드량은 React의 1/3~1/5 수준이다. 느린 네트워크나 저사양 폰에서 체감 차이가 크고, 구글 검색 순위에 영향을 주는 성능 점수에도 유리하다.

### 벤치마크 (js-framework-benchmark, 2025~2026)

| 지표 | React 19 | Svelte 5 | 비고 |
|---|---|---|---|
| 1000행 생성 | 28.4 ops/sec | 39.5 ops/sec | 높을수록 빠름 |
| 1000행 업데이트 | 25.6 ops/sec | 35.8 ops/sec | |
| 행 스왑 | 8.9 ops/sec | 11.4 ops/sec | |
| Startup | 52ms | 32ms | 낮을수록 빠름 |
| 첫 상호작용 가능 시점 | 350ms | 200ms | |
| 주요 콘텐츠 표시 시점 | 1,200ms | 850ms | |

Svelte가 거의 모든 지표에서 앞선다. "이전 화면과 새 화면을 비교"하는 중간 단계가 없기 때문이다. 뭐가 바뀌었는지 이미 알고 있으니, 해당 부분만 바로 고친다.

### 격차는 좁혀지고 있다

React도 가만히 있지 않는다.

- **React Compiler**: React 19에 도입된 자동 최적화. 수동으로 성능 코드를 넣지 않아도 컴파일러가 불필요한 다시 그리기를 잡아준다.
- **서버 컴포넌트 (RSC)**: 서버에서 미리 그려서 보내는 방식. 브라우저가 다운로드할 코드가 30~50% 줄어든다.

솔직히 대부분의 앱에서 프레임워크 성능 차이는 체감하기 어렵다. API 호출, 데이터베이스, 이미지 로딩이 느린 경우가 훨씬 많다. "프레임워크 A가 벤치마크에서 30% 빠르다"는 사실이지만, 그 30%가 사용자 경험에 의미 있는 차이를 만드는 경우는 드물다.

성능이 진짜 중요한 곳은 따로 있다. 수천 개의 행을 렌더링하는 테이블, 실시간 데이터 스트리밍 대시보드, 저사양 모바일 기기 대상 서비스. 이런 경우에는 Svelte의 접근이 확실히 유리하다.

## 생태계

기술 선택에서 성능만큼 중요한 게 생태계다. 아무리 좋은 프레임워크도, 필요한 라이브러리가 없으면 직접 만들어야 한다.

### 규모 차이

| | React | Svelte |
|---|---|---|
| 주간 npm 다운로드 | 89.7M | 3.64M |
| GitHub Stars | 243K | 86K |
| npm 패키지 수 | 50,000+ | 수천 개 |

React의 다운로드 수는 Svelte의 약 25배다. 이 수치가 곧 "생태계 깊이"를 의미한다. 어떤 문제를 만나든 React에서는 이미 누군가 라이브러리를 만들어놨을 가능성이 높다.

### 메타 프레임워크: Next.js vs SvelteKit

풀스택 프레임워크 비교다.

| 기능 | Next.js | SvelteKit |
|---|---|---|
| SSR | App Router + RSC | 지원 |
| SSG | 지원 | 지원 |
| 페이지별 자동 갱신 | 지원 | 부분 지원 |
| 파일 기반 라우팅 | 지원 | 지원 |
| API Routes | 지원 | 지원 |
| 이미지 최적화 | 내장 | 직접 설정 |
| 배포 | Vercel 최적화 | 어댑터 기반 (범용) |
| 번들 크기 | 200~300 KB | 50~100 KB |

Next.js는 Vercel 플랫폼과의 통합이 강점이다. 배포, 미리보기, 서버 실행이 매끄럽게 연결된다. 서버 컴포넌트로 브라우저에 보내는 코드도 줄일 수 있다. 단, Vercel이 아닌 환경에서는 일부 기능이 제한된다.

SvelteKit은 어댑터 시스템 덕분에 Cloudflare, Vercel, Node 등 어디에나 배포할 수 있다. 특정 플랫폼에 종속되지 않는다. 번들 크기도 작다. 다만 이미지 최적화나 페이지 자동 갱신 같은 기능은 직접 설정해야 한다.

### UI 컴포넌트 라이브러리

**React:** shadcn/ui, Radix UI, MUI, Ant Design, Chakra UI, Headless UI, Mantine, React Aria. 선택지가 넘친다. 어떤 디자인 시스템을 원하든 이미 구현체가 있다.

**Svelte:** shadcn-svelte(shadcn/ui 포팅), Skeleton UI, Flowbite-Svelte. 빠르게 성장 중이지만 React에 비하면 아직 선택지가 적다. Tailwind 기반의 DaisyUI처럼 프레임워크에 구애받지 않는 라이브러리를 쓰는 것도 방법이다.

### 상태관리

| | React | Svelte |
|---|---|---|
| 내장 | useState, useReducer, Context | `$state`, stores |
| 서드파티 | Zustand, Redux Toolkit, Jotai | 대부분 내장으로 충분 |
| 서버 상태 | TanStack Query, SWR | TanStack Query (Svelte 버전) |

Svelte는 상태관리 라이브러리를 따로 고를 필요가 거의 없다. `$state`와 내장 store로 대부분의 패턴을 커버할 수 있다. React은 Context API만으로는 부족한 경우가 많아서 Zustand 같은 서드파티에 의존하게 된다. 이게 좋은 건지 나쁜 건지는 관점에 따라 다르다. React은 "원하는 도구를 고를 자유"가 있고, Svelte는 "고를 필요가 없는 편리함"이 있다.

## 어떤 상황에서 어느 쪽이 맞는가

| 상황 | 추천 | 이유 |
|---|---|---|
| 대규모 팀, 엔터프라이즈 | React | 검증된 패턴, 풍부한 생태계, 레퍼런스 |
| 복잡한 서드파티 통합 | React | 대부분의 서비스가 React SDK를 먼저 제공 |
| 성능 민감한 마케팅/랜딩 | Svelte | 작은 번들, 빠른 TTI, Core Web Vitals 유리 |
| 소규모 팀, 1인 개발 | Svelte | 보일러플레이트 적고, 빌트인 기능 풍부 |
| 임베디드 위젯 | Svelte | 런타임 없는 경량 컴포넌트 |
| 새 프로젝트, DX 우선 | Svelte | 간결한 코드, 빠른 프로토타이핑 |
| Next.js RSC가 필요한 경우 | React | SvelteKit에 아직 동등한 기능 없음 |

두 프레임워크 모두 프로덕션에서 충분히 검증된 도구다. React은 10년 넘게 쌓인 생태계와 레퍼런스가 있고, Svelte는 컴파일러 기반의 근본적인 장점이 있다. "어느 게 더 좋다"가 아니라, 프로젝트의 제약 조건과 팀의 상황에 맞는 걸 고르면 된다.

한 가지 확실한 건, Svelte를 한 번이라도 써본 개발자는 `$state`와 `$derived`의 편리함을 잊기 어렵다는 것이다. React에서 의존성 배열과 씨름하다가 Svelte로 오면, "원래 이렇게 간단한 거였어?"라는 생각이 든다. 물론 그 반대도 있다. React의 명시적인 데이터 흐름과 거대한 생태계에 익숙한 개발자는 Svelte의 "마법"이 불안할 수 있다.

결국 프레임워크는 도구일 뿐이다. 도구를 잘 쓰려면 그 도구의 장단점을 알아야 한다. 이 글이 그 판단에 도움이 됐으면 한다.

## 참고 자료

- [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) - 프레임워크별 런타임 성능 벤치마크
- [Svelte vs React: A Technical Comparison](https://manuelsanchezdev.com/blog/svelte-react-comparison/) - 반응성 모델 상세 비교
- [SvelteKit vs Next.js (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/sveltekit-vs-nextjs/) - 메타 프레임워크 비교
- [npmtrends: react vs svelte](https://npmtrends.com/react-vs-svelte) - npm 다운로드 추이
