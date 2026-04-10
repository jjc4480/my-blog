---
title: SvelteKit Cloudflare 배포
date: 2026-04-07
description: adapter-cloudflare 배포 가이드
tags: [sveltekit, cloudflare]
category: infrastructure
---
adapter-cloudflare로 SvelteKit을 배포한다.

## 주의점

- Workers는 V8 기반, Node.js API 불가
- 환경변수는 platform.env로 접근
