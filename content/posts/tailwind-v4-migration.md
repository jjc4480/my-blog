---
title: Tailwind CSS v4로 마이그레이션한 경험
date: 2026-04-08
description: Tailwind CSS v3에서 v4로 마이그레이션하면서 달라진 점과 주의사항을 정리한다.
tags:
  - tailwindcss
  - css
  - frontend
category: frontend
published: true
---
Tailwind CSS v4가 정식 릴리스되면서 프로젝트를 마이그레이션했다. 가장 큰 변화는 설정 방식이다.

## 설정 파일이 사라졌다

v3에서는 `tailwind.config.js`에서 테마를 커스텀했다. v4에서는 CSS 안에서 직접 설정한다.

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.35 0.05 250);
  --font-sans: 'Pretendard', system-ui, sans-serif;
}
```

`@theme` 디렉티브 안에서 CSS 커스텀 프로퍼티로 토큰을 정의한다. JavaScript 설정 파일이 필요 없다.

## PostCSS vs Vite 플러그인

v4는 두 가지 통합 방식을 제공한다.

```javascript
// vite.config.ts — Vite 플러그인 방식 (권장)
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()]
});
```

PostCSS 방식(`@tailwindcss/postcss`)도 있지만, Vite 프로젝트에서는 Vite 플러그인이 더 빠르고 안정적이었다. `@import "tailwindcss"` 구문이 PostCSS에서 파일 경로로 해석되는 문제가 있었다.

## oklch 색상 시스템

v4는 oklch 색상 공간을 기본으로 사용한다. hex나 hsl보다 인간의 색 인지에 가깝다.

```css
/* 밝기(L), 채도(C), 색상(H) */
--color-accent: oklch(0.65 0.06 250);
```

다크모드 팔레트를 설계할 때 밝기 값만 조절하면 같은 톤을 유지할 수 있어서 편리하다.

## 마이그레이션 팁

1. `npx @tailwindcss/upgrade` 도구가 대부분의 변환을 자동으로 해준다
2. `@apply` 구문은 그대로 동작한다
3. 플러그인 생태계는 아직 v4를 완전히 지원하지 않는 것도 있다 — 확인 후 업데이트
4. `theme()` 함수 대신 CSS 변수를 직접 참조하는 방식으로 바뀌었다
