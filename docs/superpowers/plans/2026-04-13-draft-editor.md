# Draft Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** GitHub OAuth 인증 기반 웹 마크다운 에디터로 블로그 초안을 작성/편집/게시

**Architecture:** SvelteKit server routes로 GitHub OAuth + Contents API 프록시, 클라이언트 split-view 에디터. hooks.server.ts에서 /drafts 인증 체크.

**Tech Stack:** SvelteKit server routes, GitHub OAuth, GitHub Contents API, marked, shiki

---

## File Structure

```
src/
├── hooks.server.ts                    — 인증 미들웨어
├── app.d.ts                           — Locals, Platform 타입
├── lib/server/
│   ├── auth.ts                        — GitHub OAuth 헬퍼
│   ├── session.ts                     — 쿠키 세션 HMAC-SHA256
│   └── github.ts                      — GitHub Contents API 래퍼
├── lib/draft/markdown.ts              — 클라이언트 마크다운 렌더링
├── routes/auth/
│   ├── github/+server.ts              — OAuth 시작
│   ├── github/callback/+server.ts     — OAuth 콜백
│   └── logout/+server.ts              — 로그아웃
├── routes/api/drafts/
│   ├── +server.ts                     — GET 목록, POST 생성
│   └── [slug]/+server.ts             — GET/PUT/DELETE
└── routes/drafts/
    ├── +layout.server.ts              — 인증 데이터
    ├── +layout.svelte                 — 초안 레이아웃
    ├── +page.svelte / +page.ts        — 초안 목록
    ├── new/+page.svelte               — 새 초안 폼
    └── [slug]/+page.svelte, +page.ts  — Split view 에디터
```

---

## Task 1: 타입 정의 및 환경변수
**Files:** Modify `src/app.d.ts`, `wrangler.toml`
- [ ] app.d.ts: App.Locals에 user: {login,token}|null, App.Platform에 env 타입
- [ ] wrangler.toml: 환경변수 주석 (GITHUB_CLIENT_ID 등 5개)
- [ ] 커밋

## Task 2: 세션 관리
**Files:** Create `src/lib/server/session.ts`
- [ ] HMAC-SHA256 sign/verify, createSessionCookie, getSessionUser. payload=JSON{login,token,exp}, 쿠키 7일 httpOnly secure
- [ ] 커밋

## Task 3: GitHub OAuth Flow
**Files:** Create `src/lib/server/auth.ts`, `src/routes/auth/github/+server.ts`, callback, logout
- [ ] auth.ts: getGitHubAuthUrl, exchangeCodeForToken, getGitHubUser (scope:repo)
- [ ] /auth/github: GitHub authorize redirect
- [ ] /auth/github/callback: 토큰교환→사용자검증→세션발급→/drafts redirect
- [ ] /auth/logout: 쿠키삭제→/ redirect
- [ ] 모든 auth 라우트 prerender=false
- [ ] 커밋

## Task 4: 인증 미들웨어
**Files:** Create `src/hooks.server.ts`
- [ ] 세션확인→locals.user. /drafts,/api/drafts 미인증시 redirect 또는 401
- [ ] 커밋

## Task 5: GitHub Contents API
- [ ] Create src/lib/server/github.ts
- [ ] Commit
## Task 6-11: See design spec for details
Remaining tasks: API routes, markdown rendering, drafts UI, editor, build verify
