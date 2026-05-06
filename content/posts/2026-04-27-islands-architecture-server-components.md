---
title: "CSR도 SSR도 아닌 Islands — 2026년 렌더링 전략 완전 정리"
date: "2026-04-27"
published: true
category: "backend"
tags: ["Frontend", "Islands Architecture", "React Server Components", "Astro", "SvelteKit", "rendering"]
description: "Astro Islands, React Server Components, SvelteKit hybrid rendering 비교. 언제 어떤 전략을 선택하는지 정리한다."
---

2026년 프론트엔드 렌더링은 SPA vs MPA 구도가 아니다. Astro Islands, RSC, SvelteKit이 각자의 방식으로 같은 문제를 풀고 있다.

문제는 하나: JS를 최소화하면서 필요한 곳에서만 인터랙티브하게 만들기.

## 기초 정리: 4가지 렌더링 모델

**CSR**: 브라우저가 JS로 전부 렌더링. 초기 로드 느리고 SEO 어렵지만 인터랙션 풍부.

**SSR**: 서버가 매 요청마다 HTML 렌더링. 초기 로드 빠르고 SEO 유리하지만 hydration 필요.

**SSG**: 빌드 타임에 HTML 미리 생성. 가장 빠르지만 동적 콘텐츠에 한계.

**Islands / RSC**: 정적 부분은 최대한 빠르게, 인터랙티브 부분만 선택적으로 JS 로드.

## Islands Architecture: Astro의 방식

페이지의 대부분은 정적 HTML이고, 인터랙티브가 필요한 부분만 "섬(island)"으로 hydrate한다.

```html
<Header />                         <!-- 정적 HTML -->
<ImageCarousel client:visible />   <!-- Island: 뷰포트 진입 시 hydrate -->
<SearchBar client:load />          <!-- Island: 즉시 hydrate -->
```

| 디렉티브 | hydration 타이밍 |
|---|---|
| `client:load` | 즉시 |
| `client:idle` | 브라우저 idle 시 |
| `client:visible` | 뷰포트 진입 시 |

## React Server Components: Next.js App Router의 방식

기본적으로 모든 컴포넌트는 Server Component. 클라이언트에서 실행되는 것만 명시한다.

```tsx
// Server Component (기본값)
export default async function Page({ params }) {
  const post = await getPost(params.id)  // 서버에서 직접 DB 조회
  return <article><LikeButton likes={post.likes} /></article>
}

// Client Component
'use client'
export default function LikeButton({ likes }) {
  const [count, setCount] = useState(likes)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

## Islands vs RSC: 무엇이 다른가

| | Astro Islands | React Server Components |
|---|---|---|
| 기반 | Astro (모든 UI 프레임워크) | React (Next.js App Router) |
| 인터랙티브 선언 | `client:*` 디렉티브 | `'use client'` 경계 |
| 혼합 프레임워크 | React+Vue+Svelte 가능 | React 전용 |
| 적합한 상황 | 콘텐츠 중심 사이트 | React SPA 점진적 서버화 |

## SvelteKit의 접근

Islands나 RSC 같은 명시적 패러다임 대신, 파일 컨벤션으로 서버/클라이언트 분리.

```typescript
// +page.server.ts — 항상 서버에서만 실행
export const load = async ({ params }) => {
  const post = await db.posts.findById(params.id)
  return { post }
}
```

## 언제 어떤 전략을 선택하나

| 상황 | 추천 |
|---|---|
| 블로그, 문서 사이트, 마케팅 | Astro Islands |
| React 팀, 풀스택 Next.js | RSC + Next.js App Router |
| TypeScript 풀스택, 간결한 DX | SvelteKit |
| 대시보드, 실시간 인터랙션 | CSR + React/Vue |

## 결론

셋 모두 같은 방향: 브라우저에 보내는 JS를 줄이고, 필요한 곳에서만 인터랙티브하게.
선택 기준은 팀의 기존 스택과 프로젝트 특성이다.

---

## 참고 자료

- [Islands Architecture — Astro 공식 문서](https://docs.astro.build/en/concepts/islands/)
- [Server and Client Components — Next.js 공식 문서](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
