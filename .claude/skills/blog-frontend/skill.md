---
name: blog-frontend
description: "SvelteKit + shadcn-svelte 블로그의 페이지, 컴포넌트, 레이아웃 개발 스킬. 블로그 UI 작업, 컴포넌트 생성/수정, 레이아웃 변경, 다크모드, 스타일링 관련 작업 시 반드시 이 스킬을 사용할 것."
---

# Blog Frontend Development

SvelteKit + shadcn-svelte 블로그의 프론트엔드를 개발한다.

## 작업 전 필수

1. `.claude/skills/blog-frontend/references/design-refs.md`를 읽고 벤치마킹 사이트의 스타일을 숙지한다.
2. 가능하면 레퍼런스 사이트를 브라우저로 직접 확인한다.
3. 기존 컴포넌트가 있으면 스타일 일관성을 위해 먼저 확인한다.

## 디자인 원칙

### 레이아웃
- 콘텐츠 영역 최대 너비: 720px (코드 블록은 800px)
- 의도적 여백으로 시선 흐름을 유도한다
- 완벽한 대칭보다 자연스러운 비대칭을 선호한다

### 타이포그래피
- 제목-본문 위계를 명확하게 한다
- 행간 1.7~1.8, 본문 16~18px
- 한글 폰트는 Pretendard 또는 시스템 폰트 스택 사용

### 색상
- 모노톤 베이스 + 포인트 컬러 1개
- shadcn-svelte 기본 zinc 팔레트를 그대로 쓰지 않고 커스텀한다
- 다크모드는 단순 반전이 아닌 별도 팔레트 설계

### 컴포넌트
- 과한 카드 그림자, 둥근 모서리(border-radius > 8px), 애니메이션 금지
- hover 시 미세한 색상 변화 정도만 허용
- 꼭 필요한 인터랙션만 최소한으로

## 파일 구조

```
src/
├── routes/
│   ├── +layout.svelte          # 전체 레이아웃 (헤더, 푸터)
│   ├── +page.svelte            # 홈 (포스트 목록)
│   ├── blog/[slug]/+page.svelte
│   ├── tags/[tag]/+page.svelte
│   ├── category/[cat]/+page.svelte
│   └── search/+page.svelte
├── lib/
│   └── components/
│       ├── layout/             # Header, Footer, Nav
│       ├── post/               # PostCard, PostList, TOC
│       ├── common/             # TagChip, Pagination, SearchInput
│       └── ui/                 # shadcn-svelte 커스텀 컴포넌트
```

## shadcn-svelte 사용 가이드

- `npx shadcn-svelte@latest add <component>` 로 필요한 컴포넌트만 추가
- 추가 후 반드시 커스텀 (기본 스타일 그대로 사용 금지)
- 필요한 컴포넌트: button, card, badge, separator, toggle, input
