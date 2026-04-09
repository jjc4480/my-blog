# PROJECT.md - my-blog

## 개요
SvelteKit + Cloudflare Pages 기반 개인 기술블로그. 모던하고 깔끔한 디자인, "사람이 만든 느낌" 지향.
https://github.com/jjc4480/my-blog

## 스택
- **Language**: TypeScript
- **Framework**: SvelteKit
- **UI**: shadcn-svelte + Tailwind CSS
- **Markdown**: mdsvex + shiki (코드 하이라이팅)
- **Search**: flexsearch (클라이언트 사이드)
- **OG Image**: satori + resvg
- **피드**: RSS, Sitemap
- **인프라**: Cloudflare Pages (adapter-cloudflare)
- **Analytics**: Cloudflare Web Analytics
- **수익화**: Google Ads (콘텐츠 비침해 배치)
- **패키지 매니저**: (미정 — npm 또는 pnpm)

## 아키텍처
정적 사이트 + 클라이언트 사이드 검색. 모놀리스 구조. 콘텐츠는 마크다운 파일 기반.
빌드 시 RSS, Sitemap, OG 이미지 자동 생성. 백엔드 없음.

## 프로젝트 구조
```
my-blog/
├── src/
│   ├── routes/          — SvelteKit 페이지 라우트
│   ├── lib/
│   │   ├── components/  — shadcn-svelte 커스텀 컴포넌트
│   │   ├── content/     — 마크다운 유틸, 검색 인덱스, 타입
│   │   ├── seo.ts       — SEO 메타 유틸
│   │   └── config.ts    — 블로그 설정
│   └── app.html
├── content/posts/       — 마크다운 포스트
├── static/
├── svelte.config.js
├── wrangler.toml
└── docs/superpowers/    — 설계 스펙 및 구현 계획
```

현재 상태: 설계/계획 단계 완료. 구현 코드 없음.

## 개발 환경
- **설치**: `npm install` (예정)
- **실행**: `npm run dev`
- **빌드**: `npm run build` → `vite build`
- **테스트**: (미정의)
- **린트**: (미정의)
- **배포**: Cloudflare Pages

## 코드 컨벤션
- **네이밍**: 컴포넌트 PascalCase (`PostCard.svelte`), 유틸 camelCase (`seo.ts`), 라우트 SvelteKit 표준 (`+page.svelte`)
- **스타일**: Tailwind CSS, shadcn-svelte 기본 테마 커스텀 필수
- **Git**: conventional commits 스타일

## 블로그 기능
- 포스트 목록 / 상세
- 태그 / 카테고리
- 코드 하이라이팅
- 다크모드
- 검색
- RSS / Sitemap
- OG 이미지 자동 생성
- Cloudflare Web Analytics

## 디자인
- **스타일**: 모던, 깔끔, 미니멀
- **콘텐츠 가독성 최우선**: 여백과 타이포그래피로 위계를 만든다
- **색상**: 절제된 모노톤 + 포인트 컬러 1개
- **shadcn-svelte 기본 테마를 그대로 쓰지 않고 커스텀**

## 글쓰기 톤 레퍼런스
- 우아한형제들, 토스 등 국내 기술블로그의 글쓰기 스타일 참고
- 바로 본론, 개발자 톤
- "이 글에서는 ~에 대해 알아보겠습니다" 식 뻔한 서론 금지

## 핵심 원칙: "사람이 만든 느낌"

AI가 찍어낸 듯한 패턴을 철저히 피한다.

| 금지 (AI스러운) | 지향 (사람스러운) |
|----------------|-----------------|
| 완벽한 대칭, 뻔한 그리드 | 의도적 여백, 자연스러운 레이아웃 |
| 파란색/보라색 그라데이션 | 절제된 모노톤 + 포인트 컬러 1개 |
| 과한 카드 그림자/둥근 모서리/애니메이션 | 미니멀, 미세한 인터랙션만 |
| 화려한 OG 이미지 | 깔끔한 단색 배경 + 타이틀만 |
| 보일러플레이트 텍스트 | 직접 작성한 콘텐츠 |

## 환경변수
(현재 없음)

| 변수 | 용도 |
|------|------|
| `CF_ANALYTICS_TOKEN` | Cloudflare Web Analytics 토큰 |
| `GOOGLE_ADSENSE_ID` | Google AdSense 퍼블리셔 ID |

## 외부 서비스
- Cloudflare Pages — 호스팅 및 CDN
- Cloudflare Web Analytics — 방문자 분석
- Google AdSense — 광고 수익화

## 주의사항
- 콘텐츠는 사용자가 직접 작성. 에이전트는 인프라/개발만 담당
- `content/posts/`에 포스트가 쌓이면 기존 톤/구조를 분석하여 일관성 유지
- Frontmatter: title, date, description, tags, category 필수 / thumbnail, published 선택
- Post 타입 인터페이스는 frontend ↔ content 간 공유 계약 — 변경 시 양쪽 정합성 확인

## 참고 문서
- 설계 스펙: `docs/superpowers/specs/2026-04-09-tech-blog-harness-design.md`
- 구현 계획: `docs/superpowers/plans/2026-04-09-tech-blog-harness.md`
