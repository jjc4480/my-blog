---
name: blog-content
description: "블로그 콘텐츠 파이프라인 스킬. mdsvex 설정, 코드 하이라이팅(shiki), RSS/Sitemap 생성, OG 이미지 자동 생성, 검색 인덱스(flexsearch) 구축. 마크다운 처리, 피드, 검색, OG 관련 작업 시 반드시 이 스킬을 사용할 것."
---

# Blog Content Pipeline

블로그의 콘텐츠 처리 파이프라인을 구축하고 유지보수한다.

## Frontmatter 스키마

```yaml
---
title: string          # 필수. 포스트 제목
date: string           # 필수. YYYY-MM-DD 형식
description: string    # 필수. 포스트 요약 (SEO용, 160자 이내)
tags: string[]         # 필수. 태그 목록
category: string       # 필수. 카테고리 (1개)
thumbnail: string      # 선택. 썸네일 이미지 경로
published: boolean     # 선택. 기본값 true. false면 빌드에서 제외
---
```

이 스키마 외에 추가 필드를 만들지 않는다. 필요하면 사용자와 상의한다.

## TypeScript 타입 (공유 계약)

```typescript
interface Post {
  title: string;
  date: string;
  description: string;
  tags: string[];
  category: string;
  thumbnail?: string;
  published?: boolean;
  slug: string;        // 파일명에서 자동 생성
  content: string;     // 렌더링된 HTML
}
```

이 타입은 `src/lib/content/types.ts`에 정의하며, frontend-dev의 컴포넌트가 이 타입을 import하여 사용한다. **타입 변경 시 frontend-dev 컴포넌트와의 정합성을 반드시 확인한다.**

## mdsvex 설정

- 확장자: `.md` (`.svx`가 아닌 `.md` 사용 — 에디터 호환성)
- 코드 하이라이팅: shiki (테마: `github-dark` / `github-light` 다크모드 연동)
- 레이아웃: `src/lib/content/post-layout.svelte` (포스트 공통 레이아웃)

## 포스트 파일 위치

```
content/posts/
├── my-first-post.md
├── sveltekit-tutorial.md
└── ...
```

slug는 파일명에서 자동 생성한다 (`.md` 제거).

## RSS 피드

- 경로: `/rss.xml`
- SvelteKit server route (`+server.ts`)로 구현
- 최근 20개 포스트 포함
- `published: false` 포스트 제외

## Sitemap

- 경로: `/sitemap.xml`
- 모든 공개 페이지 + 포스트 URL 포함
- lastmod는 포스트의 date 필드 사용

## OG 이미지

- 경로: `/og/[slug].png`
- satori로 HTML → SVG, resvg로 SVG → PNG
- 디자인: 깔끔한 단색 배경 + 포스트 타이틀 + 블로그명
- 화려한 그라데이션 금지

## 검색

- flexsearch 사용 (클라이언트 사이드)
- 빌드 시 검색 인덱스를 JSON으로 생성
- 인덱싱 대상: title, description, tags, 본문 텍스트
- 검색 결과: 포스트 카드 형태로 표시
