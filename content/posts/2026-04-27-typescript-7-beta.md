---
title: "TypeScript 7.0 Beta: 10배 빠른 컴파일러의 실제 마이그레이션 비용"
date: "2026-04-27"
published: true
category: "backend"
tags: ["TypeScript", "JavaScript", "compiler", "migration"]
description: "TypeScript 7.0 Beta — Go 기반 컴파일러, 10배 빠름. 마이그레이션 비용 정리."
---

2026년 4월 21일 Microsoft가 TypeScript 7.0 Beta를 공개했다. Project Corsa — Go 포팅 결과물이다.

타입 체킹 로직은 6.0과 동일하다. Bloomberg, Figma, Google 등에서 수개월 검증 완료.

## 설치와 실행

```bash
npm install -D @typescript/native-preview@beta
npx tsgo --project tsconfig.json
```

6.0 병렬 실행: `npm install -D typescript@npm:@typescript/typescript6`

VS Code에서는 `TypeScript Native Preview` 확장 설치 시 Language Server도 Go 기반으로 동작한다.

## 병렬화: --checkers와 --builders

```bash
npx tsgo --checkers 8
npx tsgo --builders 4 --checkers 4
npx tsgo --singleThreaded
```

## tsconfig: 7.0에서 달라지는 기본값

| 옵션 | 이전 | 7.0 |
|---|---|---|
| `strict` | `false` | `true` |
| `module` | `commonjs` | `esnext` |
| `noUncheckedSideEffectImports` | `false` | `true` |
| `rootDir` | (자동 감지) | `./` |
| `types` | `["*"]` | `[]` |

`types: []` 변경으로 `@types/*` 패키지를 명시해야 한다:

```json
{ "compilerOptions": { "types": ["node", "jest"] } }
```

## Hard Error로 바뀐 deprecated 옵션들

`module: "amd"`, `moduleResolution: "node"`, `target: "es5"`, `baseUrl` 등이 컴파일 에러로 변경됐다.

`baseUrl` 마이그레이션:

```json
// Before
{ "compilerOptions": { "baseUrl": "./", "paths": { "@/*": ["src/*"] } } }

// After
{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }
```

## 마이그레이션 체크리스트

```bash
npx tsc --noEmit 2>&1 | grep -i "deprecated"

npm install -D @typescript/native-preview@beta
npx tsc --noEmit > tsc-output.txt 2>&1
npx tsgo --noEmit > tsgo-output.txt 2>&1
diff tsc-output.txt tsgo-output.txt
```

## 프로덕션에 써도 되나?

공식 발표 기준으로 "지금 당장 써도 된다". 타입 체킹 로직은 6.0과 동일하고 대형 코드베이스에서 검증됐다.

[6.0 포스트](/blog/2026-04-22-typescript-6-corsa)에서 제기한 리스크 중 Beta 시점에서 달라진 것과 아직 남은 것을 정리한다.

**해소된 것:** WASM 퍼포먼스 우려 — Beta 기준 브라우저 에디터 툴링은 아직 6.0 기반을 유지하므로 당장 영향 없음. 동작 일치성 — Bloomberg, Figma, Google 등 대형 코드베이스 실측으로 타입 체킹 결과 동일성 검증 완료.

**아직 남은 것:** programmatic API 미완성. ts-node, ts-jest, typescript-eslint 등은 7.1까지 6.0 API 의존 상태다. 내부 컴파일러 API에 의존하는 커스텀 트랜스포머나 빌드 플러그인을 쓰는 프로젝트는 7.1 이후까지 전환을 미루는 게 낫다.

---

## 참고 자료

- [Announcing TypeScript 7.0 Beta — Microsoft DevBlogs](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/)
- [typescript-go CHANGES.md](https://github.com/microsoft/typescript-go/blob/main/CHANGES.md)
