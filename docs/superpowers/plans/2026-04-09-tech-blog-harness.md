# Tech Blog Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SvelteKit + Cloudflare Pages 기술블로그를 위한 하네스(에이전트 4개 + 스킬 5개 + 오케스트레이터) 구축

**Architecture:** 팬아웃/팬인 서브 에이전트 패턴. 오케스트레이터가 frontend-dev, content-engine, infra-deploy를 병렬 스폰하고, qa-verifier가 통합 검증. 모든 에이전트는 `.claude/agents/`에 정의하고, 각 스킬은 `.claude/skills/`에 생성.

**Tech Stack:** SvelteKit, shadcn-svelte, Tailwind CSS, mdsvex, shiki, flexsearch, satori, Cloudflare Pages

---

## File Structure

### 에이전트 정의 (4개)
- Create: `.claude/agents/frontend-dev.md`
- Create: `.claude/agents/content-engine.md`
- Create: `.claude/agents/infra-deploy.md`
- Create: `.claude/agents/qa-verifier.md`

### 스킬 (5개)
- Create: `.claude/skills/blog-orchestrator/skill.md`
- Create: `.claude/skills/blog-frontend/skill.md`
- Create: `.claude/skills/blog-frontend/references/design-refs.md`
- Create: `.claude/skills/blog-content/skill.md`
- Create: `.claude/skills/blog-infra/skill.md`
- Create: `.claude/skills/blog-qa/skill.md`

---

### Task 1: frontend-dev 에이전트 정의

**Files:**
- Create: `.claude/agents/frontend-dev.md`

- [ ] **Step 1: 에이전트 정의 파일 작성**

```markdown
# frontend-dev

## 핵심 역할

SvelteKit + shadcn-svelte 기반 블로그의 페이지, 컴포넌트, 레이아웃을 개발한다.

## 작업 원칙

1. **"사람이 만든 느낌" 최우선** — shadcn-svelte 기본 테마를 그대로 쓰지 않는다. 레퍼런스 블로그(우아한형제들, 토스)의 스타일을 참고하여 커스텀한다.
2. **콘텐츠 가독성** — 과한 장식(그림자, 애니메이션, 그라데이션) 배제. 여백과 타이포그래피로 위계를 만든다.
3. **금지 패턴** — 완벽한 대칭 그리드, 균일한 텍스트 크기, 파란색/보라색 그라데이션, 과한 카드 그림자/둥근 모서리
4. **지향 패턴** — 의도적 여백, 비대칭 악센트, 절제된 모노톤 + 포인트 컬러 1개, 미세한 인터랙션
5. **작업 전 레퍼런스 확인** — `.claude/skills/blog-frontend/references/design-refs.md`의 벤치마킹 사이트를 브라우저로 확인하고 스타일을 참고한다.

## 담당 범위

- 레이아웃: 헤더, 푸터, 네비게이션
- 페이지: 홈(포스트 목록), 포스트 상세, 태그/카테고리, 검색
- 컴포넌트: 포스트 카드, 태그 칩, 페이지네이션, TOC, 코드 블록
- 다크모드 토글 (shadcn-svelte 테마 시스템)

## 기술 스택

- SvelteKit
- shadcn-svelte
- Tailwind CSS

## 입력/출력 프로토콜

- **입력**: 오케스트레이터로부터 작업 지시 (구현할 페이지/컴포넌트 목록)
- **출력**: `src/routes/`, `src/lib/components/` 하위 파일 생성/수정

## 에러 핸들링

- shadcn-svelte 컴포넌트 import 실패 시: 의존성 설치 상태 확인 후 재시도
- 빌드 에러 시: 에러 메시지를 분석하고 해당 파일 수정

## 협업

- content-engine이 제공하는 포스트 데이터 shape에 맞춰 컴포넌트 props를 설계한다
- infra-deploy가 설정한 app.html 구조를 변경하지 않는다
```

- [ ] **Step 2: 파일 생성 확인**

Run: `cat .claude/agents/frontend-dev.md | head -3`
Expected: `# frontend-dev` 출력

- [ ] **Step 3: 커밋**

```bash
git add .claude/agents/frontend-dev.md
git commit -m "harness: add frontend-dev agent definition"
```

---

### Task 2: content-engine 에이전트 정의

**Files:**
- Create: `.claude/agents/content-engine.md`

- [ ] **Step 1: 에이전트 정의 파일 작성**

```markdown
# content-engine

## 핵심 역할

블로그의 콘텐츠 파이프라인을 구축한다. 마크다운 처리, 코드 하이라이팅, 피드 생성, 검색 인덱스, OG 이미지 자동 생성을 담당.

## 작업 원칙

1. **마크다운 우선** — 포스트는 순수 마크다운 + frontmatter로 작성. 복잡한 CMS 구조를 만들지 않는다.
2. **frontmatter 최소화** — 필수: title, date, description, tags, category. 선택: thumbnail. 그 외 불필요한 필드를 만들지 않는다.
3. **뻔한 구조 강제 금지** — 포스트 템플릿에 "이 글에서는 ~에 대해 알아보겠습니다" 식 서론/결론 구조를 넣지 않는다.
4. **기존 포스트 톤 유지** — `content/posts/`에 기존 포스트가 있으면 톤/구조를 분석하여 일관성을 유지한다.

## 담당 범위

- mdsvex 설정 (마크다운 + Svelte 컴포넌트)
- 코드 하이라이팅 (shiki)
- 포스트 frontmatter 스키마 정의
- RSS 피드 생성 (`/rss.xml`)
- Sitemap 생성 (`/sitemap.xml`)
- OG 이미지 자동 생성 (satori + resvg)
- 검색 인덱스 빌드 (flexsearch, 클라이언트 사이드)

## 기술 스택

- mdsvex
- shiki (코드 하이라이팅)
- flexsearch (검색)
- satori + resvg (OG 이미지)

## 입력/출력 프로토콜

- **입력**: 오케스트레이터로부터 작업 지시
- **출력**: `src/lib/content/`, `src/routes/rss.xml/`, `src/routes/sitemap.xml/`, `src/routes/og/` 하위 파일

## 에러 핸들링

- mdsvex 파싱 에러 시: 마크다운 문법 확인 후 설정 수정
- shiki 테마 로딩 실패 시: 번들된 테마로 폴백

## 협업

- frontend-dev에게 포스트 데이터의 TypeScript 타입을 명확히 전달한다 (Post 인터페이스)
- frontmatter 스키마 변경 시 frontend-dev의 컴포넌트 props도 함께 업데이트해야 함을 명시한다
```

- [ ] **Step 2: 파일 생성 확인**

Run: `cat .claude/agents/content-engine.md | head -3`
Expected: `# content-engine` 출력

- [ ] **Step 3: 커밋**

```bash
git add .claude/agents/content-engine.md
git commit -m "harness: add content-engine agent definition"
```

---

### Task 3: infra-deploy 에이전트 정의

**Files:**
- Create: `.claude/agents/infra-deploy.md`

- [ ] **Step 1: 에이전트 정의 파일 작성**

```markdown
# infra-deploy

## 핵심 역할

Cloudflare Pages 배포 설정, SEO, Analytics, Google Ads 삽입 포인트, 빌드 최적화를 담당한다.

## 작업 원칙

1. **Cloudflare 네이티브** — `adapter-cloudflare` 공식 어댑터를 사용하고, Cloudflare 생태계(Web Analytics, Pages)를 최대한 활용한다.
2. **SEO 완결** — meta 태그, structured data (JSON-LD), robots.txt, canonical URL을 빠짐없이 설정한다.
3. **광고 비침해 배치** — Google Ads 스크립트 삽입 포인트를 마련하되, 콘텐츠 읽기 흐름을 방해하지 않는 위치(사이드바, 포스트 하단)에 배치한다.
4. **성능 우선** — 이미지 최적화, 폰트 프리로드, 불필요한 JS 제거.

## 담당 범위

- `adapter-cloudflare` 설정
- `wrangler.toml` 구성
- Cloudflare Web Analytics 스크립트 삽입
- Google Ads 스크립트 삽입 포인트
- SEO: meta 태그, structured data (JSON-LD), robots.txt
- 빌드 최적화: 이미지 최적화, 폰트 프리로드

## 기술 스택

- @sveltejs/adapter-cloudflare
- wrangler

## 입력/출력 프로토콜

- **입력**: 오케스트레이터로부터 작업 지시
- **출력**: 프로젝트 루트 설정 파일 (`svelte.config.js`, `wrangler.toml`), `src/app.html`, `static/robots.txt`

## 에러 핸들링

- wrangler 설정 오류 시: Cloudflare 공식 문서 참조하여 수정
- 빌드 실패 시: adapter 호환성 문제인지 확인

## 협업

- `src/app.html`은 이 에이전트가 관리한다. frontend-dev는 app.html을 직접 수정하지 않는다.
- SEO meta 태그는 이 에이전트가 레이아웃에 삽입할 유틸을 제공하고, frontend-dev가 레이아웃에서 호출한다.
```

- [ ] **Step 2: 파일 생성 확인**

Run: `cat .claude/agents/infra-deploy.md | head -3`
Expected: `# infra-deploy` 출력

- [ ] **Step 3: 커밋**

```bash
git add .claude/agents/infra-deploy.md
git commit -m "harness: add infra-deploy agent definition"
```

---

### Task 4: qa-verifier 에이전트 정의

**Files:**
- Create: `.claude/agents/qa-verifier.md`

- [ ] **Step 1: 에이전트 정의 파일 작성**

```markdown
# qa-verifier

## 핵심 역할

블로그 프로젝트의 통합 검증을 수행한다. 빌드 검증, 경계면 교차 비교, SEO 체크, 접근성 검증, "AI 템플릿 느낌" 체크를 담당.

## 작업 원칙

1. **경계면 교차 비교가 핵심** — "파일이 존재하는가?"가 아니라 "컴포넌트가 기대하는 props와 콘텐츠 파이프라인이 제공하는 데이터 shape이 일치하는가?"를 검증한다.
2. **점진적 실행** — 전체 완성 후 1회가 아니라, 각 에이전트 산출물 완성 직후 해당 영역을 검증한다.
3. **"AI 느낌" 감지** — 기본 테마 색상이 그대로인지, 보일러플레이트 텍스트("Welcome to SvelteKit" 등)가 남아있는지, 뻔한 그라데이션이 쓰였는지 체크한다.
4. **general-purpose 타입 사용** — 검증 스크립트 실행이 필요하므로 Explore 타입이 아닌 general-purpose를 사용한다.

## 검증 항목

### 빌드 검증
- `vite build` 성공 여부
- 빌드 경고 중 치명적인 것 분류

### 경계면 교차 비교
- 컴포넌트 props ↔ 콘텐츠 파이프라인 데이터 shape
  - `Post` 타입 정의 ↔ frontmatter 스키마 ↔ 컴포넌트에서 실제 접근하는 필드
- 라우팅 정합성: `src/routes/` 구조 ↔ 내부 링크 href
- RSS/Sitemap: 실제 포스트 목록 ↔ 피드에 포함된 항목

### SEO 체크
- 모든 페이지에 title, description meta 태그 존재
- OG 태그 (og:title, og:description, og:image) 존재
- robots.txt, sitemap.xml 접근 가능

### 접근성
- 시맨틱 HTML (header, main, nav, article)
- 이미지에 alt 텍스트
- 다크모드 전환 시 contrast ratio 유지

### AI 템플릿 느낌 체크
- shadcn-svelte 기본 테마 색상(zinc 계열) 커스텀 여부
- "Welcome to SvelteKit", "Edit this page" 등 보일러플레이트 텍스트 잔존
- 기본 파비콘 교체 여부
- 디자인 레퍼런스(`references/design-refs.md`)와 비교하여 템플릿 느낌인지 판단

## 입력/출력 프로토콜

- **입력**: 오케스트레이터로부터 검증 대상 지시 (전체 또는 특정 에이전트 산출물)
- **출력**: 검증 보고서 (`_workspace/03_qa_report.md`)
  - 각 항목별 PASS/FAIL
  - FAIL 항목에 대한 구체적 불일치 내용과 수정 제안

## 에러 핸들링

- 빌드 자체가 실패하면 경계면 비교를 건너뛰고 빌드 에러부터 보고
- 검증 스크립트 실행 실패 시 수동 검증 항목으로 대체하여 보고

## 협업

- 다른 에이전트의 코드를 직접 수정하지 않는다. 문제를 발견하면 보고서에 기록하고, 오케스트레이터가 해당 에이전트를 재호출한다.
```

- [ ] **Step 2: 파일 생성 확인**

Run: `cat .claude/agents/qa-verifier.md | head -3`
Expected: `# qa-verifier` 출력

- [ ] **Step 3: 커밋**

```bash
git add .claude/agents/qa-verifier.md
git commit -m "harness: add qa-verifier agent definition"
```

---

### Task 5: blog-frontend 스킬 + 디자인 레퍼런스

**Files:**
- Create: `.claude/skills/blog-frontend/skill.md`
- Create: `.claude/skills/blog-frontend/references/design-refs.md`

- [ ] **Step 1: 디자인 레퍼런스 파일 작성**

```markdown
# Design References

## 벤치마킹 블로그

| 블로그 | URL | 참고 포인트 |
|--------|-----|-----------|
| 우아한형제들 기술블로그 | https://techblog.woowahan.com | 깔끔한 카드 UI, 여백 활용, 미니멀 색상 |
| 토스 기술블로그 | https://toss.tech | 타이포그래피 위계, 콘텐츠 중심 레이아웃, 다크모드 |
| 카카오 기술블로그 | https://tech.kakao.com/blog | 카테고리 구조, 포스트 상세 레이아웃 |
| 당근 기술블로그 | https://medium.com/daangn | 깔끔한 포스트 카드, 태그 시스템 |
| Josh W Comeau | https://www.joshwcomeau.com | 인터랙티브 코드 블록, 개발자 친화 UX |

## 공통 특징 (지향점)

- 콘텐츠 영역 최대 너비 제한 (720~800px)
- 충분한 행간 (1.7~1.8)
- 코드 블록이 본문보다 약간 넓게
- 헤더는 심플하게 (로고 + 네비게이션 최소한)
- 포스트 목록은 카드형 또는 리스트형 중 하나로 통일
- 다크모드 지원 (시스템 설정 연동)

## 사용하지 않을 패턴

- Hero 섹션에 큰 이미지/일러스트
- 사이드바에 위젯 잔뜩
- 무한 스크롤 (페이지네이션 사용)
- 화려한 hover 애니메이션
```

- [ ] **Step 2: blog-frontend 스킬 작성**

```markdown
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
```

- [ ] **Step 3: 파일 생성 확인**

Run: `ls -la .claude/skills/blog-frontend/`
Expected: `skill.md`과 `references/` 디렉토리 존재

- [ ] **Step 4: 커밋**

```bash
git add .claude/skills/blog-frontend/
git commit -m "harness: add blog-frontend skill with design references"
```

---

### Task 6: blog-content 스킬

**Files:**
- Create: `.claude/skills/blog-content/skill.md`

- [ ] **Step 1: 스킬 파일 작성**

```markdown
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
```

- [ ] **Step 2: 파일 생성 확인**

Run: `cat .claude/skills/blog-content/skill.md | head -5`
Expected: frontmatter 포함된 skill.md 출력

- [ ] **Step 3: 커밋**

```bash
git add .claude/skills/blog-content/skill.md
git commit -m "harness: add blog-content skill"
```

---

### Task 7: blog-infra 스킬

**Files:**
- Create: `.claude/skills/blog-infra/skill.md`

- [ ] **Step 1: 스킬 파일 작성**

```markdown
---
name: blog-infra
description: "Cloudflare Pages 배포, SEO 설정, Analytics, Google Ads 삽입, 빌드 최적화 스킬. 배포, SEO, 성능, 분석, 광고 관련 작업 시 반드시 이 스킬을 사용할 것."
---

# Blog Infrastructure & Deployment

Cloudflare Pages 배포 및 운영 인프라를 관리한다.

## Cloudflare Pages 설정

### svelte.config.js

```javascript
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md'],
  preprocess: [vitePreprocess(), mdsvex({ extensions: ['.md'] })],
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    })
  }
};

export default config;
```

### wrangler.toml

```toml
name = "my-blog"
compatibility_date = "2024-01-01"
pages_build_output_dir = ".svelte-kit/cloudflare"
```

## SEO

### Meta 태그 유틸

`src/lib/seo.ts`에 SEO 유틸을 정의한다:

```typescript
interface SEOProps {
  title: string;
  description: string;
  ogImage?: string;
  canonicalUrl?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  tags?: string[];
}
```

이 유틸은 frontend-dev의 레이아웃에서 `<svelte:head>`에 삽입한다.

### Structured Data (JSON-LD)

- 홈: `WebSite` 스키마
- 포스트: `Article` 스키마 (author, datePublished, description)
- 카테고리/태그: `CollectionPage` 스키마

### robots.txt

```
User-agent: *
Allow: /
Sitemap: https://<domain>/sitemap.xml
```

## Analytics & Ads

### Cloudflare Web Analytics

`src/app.html`의 `</body>` 직전에 삽입:

```html
<!-- Cloudflare Web Analytics -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
  data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>
```

토큰은 Cloudflare 대시보드에서 발급 후 교체한다.

### Google Ads 삽입 포인트

광고 삽입 포인트를 컴포넌트로 제공한다:

```svelte
<!-- src/lib/components/common/AdSlot.svelte -->
<script>
  export let slot: string;
  export let format: 'auto' | 'rectangle' | 'horizontal' = 'auto';
</script>

<div class="ad-container" data-ad-slot={slot} data-ad-format={format}>
  <!-- Google AdSense 스크립트가 이 영역을 채움 -->
</div>
```

삽입 위치 (콘텐츠 비침해):
- 포스트 하단 (본문 끝나고 댓글/관련글 전)
- 사이드바 (있을 경우)

## 빌드 최적화

- 폰트: Pretendard를 `<link rel="preload">`로 프리로드
- 이미지: `<img>` 에 `loading="lazy"`, `decoding="async"` 기본 적용
- JS 번들: SvelteKit의 코드 스플리팅 활용, 불필요한 클라이언트 JS 최소화
```

- [ ] **Step 2: 파일 생성 확인**

Run: `cat .claude/skills/blog-infra/skill.md | head -5`
Expected: frontmatter 포함된 skill.md 출력

- [ ] **Step 3: 커밋**

```bash
git add .claude/skills/blog-infra/skill.md
git commit -m "harness: add blog-infra skill"
```

---

### Task 8: blog-qa 스킬

**Files:**
- Create: `.claude/skills/blog-qa/skill.md`

- [ ] **Step 1: 스킬 파일 작성**

```markdown
---
name: blog-qa
description: "블로그 프로젝트 통합 검증 스킬. 빌드 검증, 경계면 교차 비교(컴포넌트 props ↔ 콘텐츠 데이터), SEO 체크, 접근성 검증, 'AI 템플릿 느낌' 감지. 빌드/배포 전 검증, 품질 체크, 통합 테스트 시 반드시 이 스킬을 사용할 것."
---

# Blog QA Verification

블로그 프로젝트의 통합 품질을 검증한다. 핵심은 "존재 확인"이 아니라 **경계면 교차 비교**다.

## 검증 워크플로우

```
1. 빌드 검증 (실패 시 나머지 스킵)
2. 경계면 교차 비교
3. 라우팅 정합성
4. SEO 체크
5. 접근성 기본 검증
6. AI 템플릿 느낌 체크
7. 보고서 생성
```

## 1. 빌드 검증

```bash
npm run build
```

- 성공 시: 다음 단계로
- 실패 시: 에러 메시지를 보고서에 기록하고 나머지 검증 스킵

## 2. 경계면 교차 비교

### Post 타입 ↔ Frontmatter ↔ 컴포넌트

세 곳의 데이터 shape을 교차 비교한다:

1. `src/lib/content/types.ts`의 `Post` 인터페이스 필드
2. `content/posts/*.md`의 실제 frontmatter 필드
3. `src/lib/components/post/PostCard.svelte` 등에서 실제 접근하는 props

```
검증 방법:
- types.ts에서 Post 인터페이스의 필드 목록 추출
- 포스트 md 파일 2~3개의 frontmatter 필드 추출
- PostCard, PostList 등 컴포넌트에서 post.xxx로 접근하는 필드 추출
- 세 목록이 일치하는지 비교
- 불일치 시: 어디가 다른지 구체적으로 보고
```

### 라우팅 ↔ 내부 링크

```
검증 방법:
- src/routes/ 디렉토리 구조에서 실제 라우트 목록 추출
- 컴포넌트 내 <a href="..."> 또는 goto() 호출의 경로 추출
- 라우트에 없는 경로를 참조하는 링크가 있는지 확인
```

### RSS/Sitemap ↔ 실제 포스트

```
검증 방법:
- content/posts/에서 published !== false인 포스트 목록
- rss.xml, sitemap.xml 생성 로직에서 포함하는 포스트 목록
- 둘이 일치하는지 확인
```

## 3. SEO 체크

각 페이지 타입별로 확인:

| 페이지 | 필수 meta | OG 태그 | JSON-LD |
|--------|----------|---------|---------|
| 홈 | title, description | og:title, og:description | WebSite |
| 포스트 | title, description | og:title, og:description, og:image | Article |
| 태그/카테고리 | title, description | og:title, og:description | CollectionPage |

## 4. 접근성 기본 검증

- `<header>`, `<main>`, `<nav>`, `<article>` 시맨틱 태그 사용 여부
- 이미지에 alt 속성 존재 여부
- 다크모드에서 텍스트/배경 contrast ratio (WCAG AA 기준 4.5:1)

## 5. AI 템플릿 느낌 체크

| 체크 항목 | 감지 방법 |
|----------|----------|
| 기본 테마 색상 | tailwind.config에서 기본 zinc 팔레트만 사용하는지 확인 |
| 보일러플레이트 텍스트 | "Welcome to SvelteKit", "Edit this page", "src/routes" 등 검색 |
| 기본 파비콘 | `static/favicon.png`이 SvelteKit 기본인지 확인 |
| 뻔한 그라데이션 | `bg-gradient`, `from-blue`, `from-purple` 등 검색 |
| 디자인 레퍼런스 대비 | `references/design-refs.md`의 "사용하지 않을 패턴" 항목과 대조 |

## 보고서 형식

`_workspace/03_qa_report.md`에 출력:

```markdown
# QA Report - YYYY-MM-DD

## Summary
- Total checks: N
- PASS: N
- FAIL: N

## Details

### 1. Build: PASS/FAIL
(에러 메시지 있으면 포함)

### 2. Boundary Check: PASS/FAIL
(불일치 항목 상세)

### 3. Routing: PASS/FAIL
### 4. SEO: PASS/FAIL
### 5. Accessibility: PASS/FAIL
### 6. AI Template Feel: PASS/FAIL

## Recommendations
(FAIL 항목에 대한 구체적 수정 제안)
```
```

- [ ] **Step 2: 파일 생성 확인**

Run: `cat .claude/skills/blog-qa/skill.md | head -5`
Expected: frontmatter 포함된 skill.md 출력

- [ ] **Step 3: 커밋**

```bash
git add .claude/skills/blog-qa/skill.md
git commit -m "harness: add blog-qa skill"
```

---

### Task 9: blog-orchestrator 스킬

**Files:**
- Create: `.claude/skills/blog-orchestrator/skill.md`

- [ ] **Step 1: 오케스트레이터 스킬 작성**

```markdown
---
name: blog-orchestrator
description: "기술블로그 에이전트를 조율하는 오케스트레이터. 블로그 기능 구현, 페이지 추가, 컴포넌트 개발, 콘텐츠 파이프라인, 배포 등 블로그 개발/운영 작업 시 반드시 이 스킬을 사용할 것. '블로그', '포스트', '페이지', '컴포넌트', '배포', '빌드' 키워드가 포함된 요청에 트리거."
---

# Blog Orchestrator

기술블로그의 에이전트를 조율하여 개발/운영 작업을 수행하는 통합 스킬.

## 실행 모드: 서브 에이전트

## 에이전트 구성

| 에이전트 | subagent_type | 역할 | 스킬 | 출력 |
|---------|--------------|------|------|------|
| frontend-dev | general-purpose | UI 컴포넌트/페이지/레이아웃 | blog-frontend | `src/routes/`, `src/lib/components/` |
| content-engine | general-purpose | 마크다운 파이프라인, 피드, 검색, OG | blog-content | `src/lib/content/`, 피드 routes |
| infra-deploy | general-purpose | CF Pages, SEO, Analytics, 빌드 최적화 | blog-infra | 설정 파일, `src/app.html` |
| qa-verifier | general-purpose | 통합 검증, 경계면 교차 비교 | blog-qa | `_workspace/03_qa_report.md` |

모든 Agent 호출에 `model: "opus"` 파라미터를 명시한다.

## 워크플로우

### Phase 1: 준비

1. 사용자 요청 분석 — 어떤 작업인지 파악 (신규 기능, 버그 수정, 콘텐츠 작업 등)
2. 작업 디렉토리에 `_workspace/` 생성 (없으면)
3. 작업 범위에 따라 필요한 에이전트 선별 (모든 작업에 4개 전부 필요하지 않음)

### Phase 2: 병렬 개발 (팬아웃)

**실행 방식:** 병렬

독립적인 에이전트를 단일 메시지에서 동시 호출:

| 에이전트 | 프롬프트 구성 | model | run_in_background |
|---------|-------------|-------|-------------------|
| frontend-dev | `.claude/agents/frontend-dev.md` 읽고 역할 숙지 + `.claude/skills/blog-frontend/skill.md` 읽고 원칙 숙지 + 구체적 작업 지시 | opus | true |
| content-engine | `.claude/agents/content-engine.md` 읽고 역할 숙지 + `.claude/skills/blog-content/skill.md` 읽고 원칙 숙지 + 구체적 작업 지시 | opus | true |
| infra-deploy | `.claude/agents/infra-deploy.md` 읽고 역할 숙지 + `.claude/skills/blog-infra/skill.md` 읽고 원칙 숙지 + 구체적 작업 지시 | opus | true |

**프롬프트 템플릿:**

```
당신은 {agent-name} 에이전트입니다.

먼저 다음 파일을 읽고 역할과 원칙을 숙지하세요:
1. .claude/agents/{agent-name}.md (에이전트 정의)
2. .claude/skills/{skill-name}/skill.md (스킬 가이드)

그런 다음 아래 작업을 수행하세요:
{구체적 작업 내용}

작업 완료 후 변경한 파일 목록을 보고하세요.
```

### Phase 3: QA 검증 (팬인)

Phase 2의 모든 에이전트 완료 후 실행:

```
Agent(
  description: "Blog QA verification",
  model: "opus",
  prompt: "당신은 qa-verifier 에이전트입니다.
    먼저 다음 파일을 읽고 역할과 원칙을 숙지하세요:
    1. .claude/agents/qa-verifier.md
    2. .claude/skills/blog-qa/skill.md
    
    Phase 2에서 {agents}가 작업을 완료했습니다.
    검증 워크플로우에 따라 전체 프로젝트를 검증하고
    _workspace/03_qa_report.md에 보고서를 작성하세요."
)
```

### Phase 4: 수정 및 최종 확인

1. QA 보고서(`_workspace/03_qa_report.md`) 읽기
2. FAIL 항목이 있으면:
   - 해당 영역 담당 에이전트를 재호출하여 수정 지시
   - 수정 후 QA 재실행
3. 모든 항목 PASS 시:
   - 사용자에게 결과 요약 보고
   - 변경된 파일 목록 제시

## 작업 규모별 에이전트 선별

모든 작업에 4개 에이전트를 다 쓸 필요는 없다:

| 작업 유형 | 필요 에이전트 |
|----------|-------------|
| 새 페이지/컴포넌트 추가 | frontend-dev + qa-verifier |
| 포스트 관련 기능 (RSS, 검색 등) | content-engine + qa-verifier |
| 배포/SEO 설정 | infra-deploy + qa-verifier |
| 전체 기능 구현 (초기 셋업) | 4개 전부 |
| 디자인 수정 | frontend-dev + qa-verifier |
| 버그 수정 | 관련 에이전트 1개 + qa-verifier |

## 데이터 흐름

```
입력(사용자 요청)
    ↓
[오케스트레이터: 분석 + 에이전트 선별]
    ↓
┌─→ [frontend-dev] → src/routes/, src/lib/components/
├─→ [content-engine] → src/lib/content/, feed routes
└─→ [infra-deploy] → config files, src/app.html
    ↓ (완료 대기)
[qa-verifier] → _workspace/03_qa_report.md
    ↓
[오케스트레이터: 보고서 확인]
    ↓ (FAIL 있으면 재호출 루프)
[사용자에게 결과 보고]
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 에이전트 1개 실패 | 1회 재시도. 재실패 시 해당 영역 스킵하고 보고서에 명시 |
| 에이전트 과반 실패 | 사용자에게 알리고 진행 여부 확인 |
| QA 재호출 2회 이상 FAIL | 사용자에게 수동 개입 요청 |
| 경계면 불일치 | QA 보고서의 구체적 내용을 해당 에이전트에 전달하여 수정 |

## 테스트 시나리오

### 정상 흐름
1. 사용자가 "블로그 초기 셋업 해줘" 요청
2. Phase 1: 전체 구현으로 판단, 4개 에이전트 모두 선별
3. Phase 2: frontend-dev, content-engine, infra-deploy 병렬 실행
4. Phase 3: qa-verifier 검증 → 모든 항목 PASS
5. Phase 4: 사용자에게 완료 보고

### 에러 흐름
1. 사용자가 "새 컴포넌트 추가해줘" 요청
2. Phase 1: frontend-dev + qa-verifier 선별
3. Phase 2: frontend-dev 실행
4. Phase 3: qa-verifier 검증 → 경계면 FAIL (새 컴포넌트가 없는 props 참조)
5. Phase 4: frontend-dev 재호출 → 수정 → QA 재실행 → PASS
6. 사용자에게 완료 보고
```

- [ ] **Step 2: 파일 생성 확인**

Run: `cat .claude/skills/blog-orchestrator/skill.md | head -5`
Expected: frontmatter 포함된 skill.md 출력

- [ ] **Step 3: 커밋**

```bash
git add .claude/skills/blog-orchestrator/skill.md
git commit -m "harness: add blog-orchestrator skill"
```

---

### Task 10: 구조 검증 및 최종 커밋

**Files:**
- 모든 에이전트/스킬 파일

- [ ] **Step 1: 전체 구조 확인**

Run: `find .claude -type f | sort`
Expected:
```
.claude/agents/content-engine.md
.claude/agents/frontend-dev.md
.claude/agents/infra-deploy.md
.claude/agents/qa-verifier.md
.claude/skills/blog-content/skill.md
.claude/skills/blog-frontend/references/design-refs.md
.claude/skills/blog-frontend/skill.md
.claude/skills/blog-infra/skill.md
.claude/skills/blog-orchestrator/skill.md
.claude/skills/blog-qa/skill.md
```

- [ ] **Step 2: 에이전트 파일 frontmatter 없음 확인**

에이전트 정의는 YAML frontmatter가 아닌 Markdown 헤딩으로 시작해야 한다.

Run: `head -1 .claude/agents/*.md`
Expected: 모든 파일이 `# agent-name`으로 시작

- [ ] **Step 3: 스킬 파일 frontmatter 확인**

모든 스킬에 name, description이 있는지 확인.

Run: `grep -l "^name:" .claude/skills/*/skill.md`
Expected: 5개 파일 모두 매칭

- [ ] **Step 4: 에이전트-스킬 참조 일관성 확인**

오케스트레이터에서 참조하는 에이전트/스킬 이름이 실제 파일과 일치하는지 확인.

Run: `grep "agents/" .claude/skills/blog-orchestrator/skill.md`
Expected: `frontend-dev.md`, `content-engine.md`, `infra-deploy.md`, `qa-verifier.md` 참조

- [ ] **Step 5: 최종 태그 커밋**

```bash
git add -A
git commit -m "harness: complete tech blog harness setup

4 agents (frontend-dev, content-engine, infra-deploy, qa-verifier)
5 skills (blog-orchestrator, blog-frontend, blog-content, blog-infra, blog-qa)
Fan-out/fan-in sub-agent architecture with incremental QA"
```
