# DEPLOY

## 개요

이 프로젝트는 **Cloudflare Pages** 에 `wrangler pages deploy` 로 직접 배포한다. **GitHub ↔ Pages 연동은 설정돼 있지 않다** (wrangler pages project list 기준 `Git Provider: No`). 즉 git push 만으로는 운영 도메인 https://jcjang-blog.pages.dev 가 절대 갱신되지 않는다.

## 한 줄 요약

```
bun run deploy
```

이 스크립트는 내부적으로 다음을 수행한다:

```
vite build && wrangler pages deploy .svelte-kit/cloudflare --project-name jcjang-blog
```

1. `vite build` — SvelteKit adapter-cloudflare 가 `.svelte-kit/cloudflare` 에 정적 자산 + Worker 번들을 만든다.
2. `wrangler pages deploy .svelte-kit/cloudflare --project-name jcjang-blog` — Cloudflare Pages 프로젝트 `jcjang-blog` 에 업로드하고 https://jcjang-blog.pages.dev 에 반영한다.

## 전제 조건

- `wrangler` CLI 는 `devDependencies` 에 이미 포함돼 있어 `bunx wrangler …` 로 바로 호출 가능.
- 첫 실행 시 `bunx wrangler login` 필요 (OAuth 브라우저 인증). 이후 머신에 토큰이 캐시됨.
- `wrangler.toml` 의 `name = "jcjang-blog"` / `pages_build_output_dir = ".svelte-kit/cloudflare"` 값이 현재 배포 방식과 일치해야 함.

## 배포 전 체크리스트

1. `bun run check` — 타입/문법 통과
2. `bunx vitest run` — 테스트 통과
3. `git status` — 의도하지 않은 uncommitted 변경 없는지 확인. Vite 빌드는 **working tree 전체** 를 사용하므로 half-done 파일이 들어 있으면 운영에 나간다.
4. 필요하면 사전 `bun run build` 로 빌드만 한 번 돌려보고 경고를 확인.
5. `bun run deploy` 실행.
6. wrangler 출력의 "Deployment URL" / "Deployment alias URL" 로 실물 확인.

## 흔한 실수

- **"bun run build 성공" ≠ "배포 완료"**. `vite build` 는 로컬 아티팩트만 만든다. `wrangler pages deploy` 단계가 있어야 운영에 반영됨.
- 작업 완료 보고에 "배포됐다" 고 쓰려면 실제로 `bun run deploy` 를 돌린 뒤 wrangler 응답의 Deployment URL 을 받은 뒤에만.

## 수동 명령 단계별

평소에는 `bun run deploy` 한 줄로 충분하지만, 단계를 나눠 디버깅할 때:

```
bun run build
bunx wrangler whoami               # 인증 상태 확인
bunx wrangler pages project list   # jcjang-blog 가 보이고 Git Provider: No 라면 OK
bunx wrangler pages deploy .svelte-kit/cloudflare --project-name jcjang-blog
```

## 롤백

Cloudflare Pages 대시보드(https://dash.cloudflare.com) 의 `jcjang-blog` → `Deployments` 에서 이전 배포를 "Rollback" 으로 복구할 수 있다. 같은 작업을 CLI 로 하려면:

```
bunx wrangler pages deployment list --project-name jcjang-blog
bunx wrangler pages rollback <deployment-id> --project-name jcjang-blog
```

## 시크릿 / 환경변수

빌드 타임에 Vite 가 쓰는 공개 환경변수(`VITE_*`)는 빌드 머신의 env 가 그대로 반영된다. 런타임 시크릿(예: `SESSION_SECRET`, `GITHUB_CLIENT_SECRET`) 은 Cloudflare Pages 프로젝트의 Environment Variables 대시보드에 미리 등록해 두어야 한다 (`wrangler pages secret put <NAME> --project-name jcjang-blog` 로도 가능).
