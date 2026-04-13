# Draft Editor — Design Spec

## Overview

블로그에 초안 작성/편집/게시 기능을 추가한다. GitHub OAuth 인증 후 웹 마크다운 에디터에서 초안을 수정하고, 게시 버튼으로 즉시 배포한다.

## Authentication

- `/drafts/**` 경로 접근 시 GitHub OAuth 필요
- SvelteKit server hooks에서 인증 체크
- OAuth flow: `/auth/github` → GitHub 인증 → 콜백 → 쿠키 세션 발급
- 허용 사용자: 환경변수 `ALLOWED_GITHUB_USER`에 설정된 username만 허용
- 세션: 서명된 쿠키 (HMAC-SHA256, 환경변수 `SESSION_SECRET`)
- 세션 만료: 7일

### OAuth 설정 필요사항
- GitHub OAuth App 생성 (Settings > Developer settings > OAuth Apps)
- 환경변수:
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `GITHUB_REPO` (e.g., "jcjang/my-blog")
  - `ALLOWED_GITHUB_USER` (e.g., "jcjang90")
  - `SESSION_SECRET` (랜덤 32+ chars)

## Pages

### `/drafts` — 초안 목록
- GitHub API로 `content/posts/` 디렉토리의 모든 .md 파일 조회
- frontmatter 파싱하여 `published: false`인 글만 표시
- 각 항목: 제목, 날짜, 카테고리, 태그
- 액션: 편집 (→ `/drafts/[slug]`), 삭제
- "새 글 작성" 버튼 → `/drafts/new`

### `/drafts/new` — 새 초안 생성
- 폼: 제목 (→ slug 자동 생성), 카테고리, 태그, 설명
- 생성 시 `published: false` frontmatter로 .md 파일을 GitHub에 커밋
- 생성 후 `/drafts/[slug]`로 리다이렉트

### `/drafts/[slug]` — Split View 에디터
- **상단**: Frontmatter 편집 폼 (title, date, description, tags, category)
- **본문**: Split view
  - 왼쪽: 마크다운 textarea (monospace, line numbers)
  - 오른쪽: 렌더링된 미리보기 (prose 스타일 적용, shiki 코드 하이라이팅)
- **액션 바**:
  - 저장 버튼 — GitHub Contents API로 커밋 (수동 저장만, 자동저장 없음)
  - 게시 버튼 — `published: true`로 변경 후 커밋 → Cloudflare 자동 빌드/배포
  - 게시 취소 버튼 (게시된 글 편집 시) — `published: false`로 변경
  - 삭제 버튼 — 파일 삭제 커밋

## GitHub API Integration

모든 API 호출은 SvelteKit server route (`/api/drafts/*`)를 통해 프록시한다.
클라이언트에서 직접 GitHub API를 호출하지 않는다 (토큰 노출 방지).

### Server API Routes

```
GET    /api/drafts          — 초안 목록 (GitHub에서 파일 목록 조회 + frontmatter 파싱)
GET    /api/drafts/[slug]   — 초안 내용 조회
POST   /api/drafts          — 새 초안 생성 (GitHub에 파일 커밋)
PUT    /api/drafts/[slug]   — 초안 수정 (GitHub에 파일 업데이트 커밋)
DELETE /api/drafts/[slug]   — 초안 삭제 (GitHub에서 파일 삭제 커밋)
```

### GitHub Contents API 사용

- 읽기: `GET /repos/{owner}/{repo}/contents/content/posts/{slug}.md`
- 쓰기: `PUT /repos/{owner}/{repo}/contents/content/posts/{slug}.md`
  - body: `{ message, content (base64), sha (업데이트 시) }`
- 삭제: `DELETE /repos/{owner}/{repo}/contents/content/posts/{slug}.md`
  - body: `{ message, sha }`
- 목록: `GET /repos/{owner}/{repo}/contents/content/posts`

커밋 메시지 형식:
- 생성: `draft: create {slug}`
- 수정: `draft: update {slug}`
- 게시: `publish: {slug}`
- 삭제: `draft: delete {slug}`

## Markdown Preview

- 클라이언트 사이드 마크다운 렌더링 (marked 또는 markdown-it)
- Shiki로 코드 하이라이팅 (빌드 타임이 아닌 런타임)
- 블로그 본문과 동일한 prose 스타일 적용
- 디바운스: 입력 후 300ms 후 미리보기 갱신

## Tech Stack

- GitHub OAuth: SvelteKit server routes (no external auth library)
- Markdown 파싱: marked (lightweight, 클라이언트 사이드)
- 코드 하이라이팅: shiki (이미 의존성에 포함)
- 에디터: textarea 기반 (CodeMirror 등은 1차에서 제외, 추후 확장)

## Scope Exclusions (1차)

- 이미지 업로드 (추후 GitHub에 이미지 커밋 방식으로 확장)
- 자동 저장
- CodeMirror/Monaco 등 리치 에디터
- 다중 사용자 / 역할 기반 접근 제어
- 커밋 이력 최적화 (squash 등)
- 오프라인 지원
