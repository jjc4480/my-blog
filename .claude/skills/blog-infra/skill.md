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
