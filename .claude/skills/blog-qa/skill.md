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
