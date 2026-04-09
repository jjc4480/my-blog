# my-blog

SvelteKit + Cloudflare Pages 기반 개인 기술블로그.

## 기술 스택

- SvelteKit, shadcn-svelte, Tailwind CSS
- mdsvex + shiki (마크다운 + 코드 하이라이팅)
- flexsearch (클라이언트 사이드 검색)
- satori + resvg (OG 이미지 자동 생성)
- Cloudflare Pages (adapter-cloudflare)

## 프로젝트 구조

```
src/routes/          # SvelteKit 페이지
src/lib/components/  # UI 컴포넌트
src/lib/content/     # 마크다운 유틸, 타입, 검색 인덱스
content/posts/       # 마크다운 포스트 파일
static/              # 정적 파일
```

## 하네스 구조

4개 에이전트 + 5개 스킬의 팬아웃/팬인 아키텍처.

- **에이전트 정의**: `.claude/agents/` (frontend-dev, content-engine, infra-deploy, qa-verifier)
- **스킬**: `.claude/skills/` (blog-orchestrator, blog-frontend, blog-content, blog-infra, blog-qa)
- **설계 스펙**: `docs/superpowers/specs/2026-04-09-tech-blog-harness-design.md`
- **구현 플랜**: `docs/superpowers/plans/2026-04-09-tech-blog-harness.md`

## 핵심 원칙

- **"사람이 만든 느낌"** — AI 템플릿 느낌 철저히 배제
- **UI/디자인**: 모던하고 깔끔한 미니멀 기술블로그 스타일
- **콘텐츠 톤**: 유명 회사 기술블로그(우아한형제들, 토스 등)의 글 정리 방식 참조
- shadcn-svelte 기본 테마 그대로 사용 금지 — 반드시 커스텀
- 과한 장식(그라데이션, 그림자, 애니메이션) 배제
- 콘텐츠 가독성 최우선

## 명령어

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 프리뷰
```
