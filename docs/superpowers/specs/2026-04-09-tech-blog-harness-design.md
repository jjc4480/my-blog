# Tech Blog Harness Design

## 개요

SvelteKit + Cloudflare Pages 기반 개인 기술블로그 프로젝트의 하네스 설계.
에이전트 팀이 개발/디자인/운영 인프라를 풀스택으로 지원하고, 콘텐츠 자체는 사용자가 주도한다.

## 기술 스택

- **프레임워크**: SvelteKit
- **UI**: shadcn-svelte + Tailwind CSS
- **마크다운**: mdsvex + shiki (코드 하이라이팅)
- **검색**: flexsearch (클라이언트 사이드)
- **OG 이미지**: satori + resvg
- **피드**: RSS, Sitemap
- **호스팅**: Cloudflare Pages (`adapter-cloudflare`)
- **분석**: Cloudflare Web Analytics
- **수익화**: Google Ads (콘텐츠 흐름 비침해 배치)

## 블로그 기능 범위

- 포스트 목록 (홈)
- 포스트 상세
- 태그 / 카테고리
- 코드 하이라이팅
- 다크모드
- 검색
- RSS 피드
- Sitemap
- OG 이미지 자동 생성
- Cloudflare Web Analytics (조회 추이)

## 레퍼런스

### UI/디자인 레퍼런스
- 모던하고 깔끔한 미니멀 기술블로그 스타일 지향
- 콘텐츠 가독성 최우선, 과한 장식 배제, 여백과 타이포그래피 중심

### 콘텐츠 구조/톤 레퍼런스
- 우아한형제들, 토스, 카카오 등 유명 회사 기술블로그의 글 구조와 정리 방식을 참조
- 기술 내용을 체계적으로 정리하는 방법, 코드 예시 배치, 개념 설명 흐름 등을 벤치마킹

## 핵심 원칙: "사람이 만든 느낌"

모든 에이전트에 관통하는 최우선 원칙. AI가 찍어낸 듯한 패턴을 철저히 피한다.

### 금지 패턴 (AI스러운)

| 영역 | 금지 |
|------|------|
| 레이아웃 | 완벽한 대칭, 뻔한 그리드 |
| 타이포그래피 | 모든 텍스트 균일한 크기/간격 |
| 색상 | 기본 템플릿 느낌의 파란색/보라색 그라데이션 |
| 컴포넌트 | 과한 카드 그림자, 둥근 모서리, 애니메이션 |
| 콘텐츠 구조 | "이 글에서는 ~에 대해 알아보겠습니다" 식 서론 |
| OG 이미지 | 화려한 그라데이션 배경 + 큰 텍스트 |

### 지향 패턴 (사람스러운)

| 영역 | 지향 |
|------|------|
| 레이아웃 | 의도적 여백, 비대칭 악센트, 시선 흐름 고려 |
| 타이포그래피 | 제목-본문 위계 명확, 적절한 행간/자간 조절 |
| 색상 | 절제된 모노톤 + 포인트 컬러 1개 |
| 컴포넌트 | 미니멀, 꼭 필요한 곳에만 미세한 인터랙션 |
| 콘텐츠 구조 | 바로 본론, 개발자 톤 |
| OG 이미지 | 깔끔한 단색 배경 + 타이틀만 |

### 레퍼런스 참조 전략

1. **UI/디자인**: 모던 미니멀 기술블로그 스타일을 지향. `references/design-refs.md`에 참고할 블로그 URL 관리. 디자인 자체를 복사하는 게 아니라 깔끔한 레이아웃과 타이포그래피 감각을 참고.
2. **콘텐츠 구조/톤**: 우아한형제들, 토스 등 유명 회사 기술블로그의 글 정리 방식을 참조. 기술 내용 전달 구조, 코드 예시 배치, 개념 설명 흐름 등을 벤치마킹. 포스트가 쌓이면 자기 자신의 톤이 기준.
3. **QA 검증**: "템플릿 느낌" 체크 + 기존 포스트와 톤 일관성 확인.

## 하네스 아키텍처

### 실행 모드: 서브 에이전트 (팬아웃/팬인)

```
[오케스트레이터]
    ├→ [frontend-dev]    — 컴포넌트, 페이지, 레이아웃
    ├→ [content-engine]  — 마크다운 파이프라인, 검색, RSS, sitemap, OG
    ├→ [infra-deploy]    — Cloudflare 배포, SEO, Analytics
    └→ [qa-verifier]     — 통합 검증, 경계면 교차 비교
```

모든 Agent 호출에 `model: "opus"` 파라미터를 명시한다.

### 데이터 전달

- **파일 기반**: `_workspace/`에 중간 산출물 저장
- 파일명 규칙: `{phase}_{agent}_{artifact}.{ext}`
- 오케스트레이터가 Agent 도구로 각 에이전트를 `run_in_background`로 병렬 스폰
- 결과 수집 후 QA 에이전트가 통합 검증

## 에이전트 상세

### 1. frontend-dev

- **역할**: SvelteKit 페이지/컴포넌트/레이아웃 개발
- **담당 범위**:
  - 레이아웃: 헤더, 푸터, 네비게이션
  - 페이지: 홈(포스트 목록), 포스트 상세, 태그/카테고리, 검색
  - 컴포넌트: 포스트 카드, 태그 칩, 페이지네이션, TOC, 코드 블록
  - 다크모드 토글 (shadcn-svelte 테마 시스템)
- **기술**: SvelteKit, shadcn-svelte, Tailwind CSS
- **출력**: `src/routes/`, `src/lib/components/`
- **원칙**: shadcn-svelte 기본 테마를 그대로 쓰지 않고, 레퍼런스 블로그 스타일로 커스텀. 과한 장식 배제. 콘텐츠 가독성 최우선.

### 2. content-engine

- **역할**: 콘텐츠 파이프라인 구축
- **담당 범위**:
  - mdsvex 설정 (마크다운 + Svelte 컴포넌트)
  - 코드 하이라이팅 (shiki)
  - 포스트 frontmatter 스키마 (title, date, tags, category, description, thumbnail)
  - RSS 피드 (`/rss.xml`)
  - Sitemap (`/sitemap.xml`)
  - OG 이미지 자동 생성 (satori + resvg)
  - 검색 인덱스 빌드 (flexsearch)
- **출력**: `src/lib/content/`, `src/routes/rss.xml/`, `src/routes/sitemap.xml/`
- **원칙**: 포스트 템플릿에 뻔한 서론/결론 구조를 강제하지 않음. frontmatter는 최소한만.

### 3. infra-deploy

- **역할**: 배포 및 운영 인프라
- **담당 범위**:
  - `adapter-cloudflare` 설정
  - `wrangler.toml` 구성
  - Cloudflare Web Analytics 스크립트 삽입
  - Google Ads 스크립트 삽입 포인트 마련
  - SEO: meta 태그, structured data (JSON-LD), robots.txt
  - 빌드 최적화: 이미지 최적화, 폰트 프리로드
- **출력**: 프로젝트 루트 설정 파일, `src/app.html`

### 4. qa-verifier

- **역할**: 통합 검증
- **검증 항목**:
  - 빌드 성공 여부 (`vite build`)
  - 경계면 교차 비교: 컴포넌트 props ↔ 콘텐츠 파이프라인 데이터 shape 일치
  - 라우팅 정합성: 모든 페이지 정상 접근
  - SEO: meta 태그, OG 태그, sitemap 포함
  - 접근성 기본 검증 (시맨틱 HTML, alt 텍스트)
  - "AI 템플릿 느낌" 체크: 기본 테마 색상, 보일러플레이트 텍스트 잔존 여부
- **타이밍**: 각 에이전트 산출물 완성 후 점진적(incremental) 실행

## 오케스트레이터 워크플로우

### 실행 흐름

```
Phase 1: 스캐폴딩
    오케스트레이터가 직접 수행
    └─ SvelteKit 프로젝트 초기화, 의존성 설치, 기본 구조 생성

Phase 2: 병렬 개발 (팬아웃)
    ├→ frontend-dev (run_in_background)
    ├→ content-engine (run_in_background)
    └→ infra-deploy (run_in_background)

Phase 3: 점진적 QA (팬인)
    └→ qa-verifier
        ├─ 각 에이전트 산출물 경계면 교차 비교
        ├─ 빌드 검증
        ├─ "AI 느낌" 체크
        └─ 문제 발견 시 해당 에이전트 재호출

Phase 4: 최종 통합
    오케스트레이터가 직접 수행
    └─ 빌드 확인, 배포 가이드 출력
```

### 에러 핸들링

- 에이전트 실패 시: 1회 재시도 → 재실패 시 해당 영역 스킵하고 보고
- 경계면 불일치 시: QA가 구체적 불일치 내용 보고, 오케스트레이터가 해당 에이전트 재호출
- 빌드 실패 시: 에러 로그 분석 후 관련 에이전트에 수정 요청

## 디렉토리 구조

```
my-blog/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte              # 홈 (포스트 목록)
│   │   ├── blog/[slug]/+page.svelte  # 포스트 상세
│   │   ├── tags/[tag]/+page.svelte   # 태그별 목록
│   │   ├── category/[cat]/+page.svelte
│   │   ├── search/+page.svelte
│   │   ├── rss.xml/+server.ts
│   │   └── sitemap.xml/+server.ts
│   ├── lib/
│   │   ├── components/               # shadcn-svelte 커스텀 컴포넌트
│   │   ├── content/                  # 마크다운 유틸, 검색 인덱스
│   │   └── config.ts                 # 블로그 설정 (title, description 등)
│   └── app.html
├── content/
│   └── posts/                        # 마크다운 포스트
├── static/
├── svelte.config.js
├── wrangler.toml
├── _workspace/                       # 에이전트 중간 산출물
└── .claude/
    ├── agents/
    │   ├── frontend-dev.md
    │   ├── content-engine.md
    │   ├── infra-deploy.md
    │   └── qa-verifier.md
    └── skills/
        ├── blog-orchestrator/skill.md
        ├── blog-frontend/
        │   ├── skill.md
        │   └── references/design-refs.md
        ├── blog-content/skill.md
        ├── blog-infra/skill.md
        └── blog-qa/skill.md
```
