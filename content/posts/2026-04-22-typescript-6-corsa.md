---
title: "TypeScript 6.0과 Project Corsa: 10배 빠른 컴파일러의 기회와 위험"
date: "2026-04-22"
description: "TS 6.0 breaking changes 정리, Go 리라이트(Project Corsa)의 배경과 리스크, 실용적 업그레이드 체크리스트까지."
tags: ["TypeScript", "JavaScript", "Go", "컴파일러"]
category: "Engineering"
published: true
---

2026년 3월 23일, TypeScript 6.0이 출시됐다. 단순한 메이저 업데이트가 아니다. 2012년부터 14년간 이어온 JavaScript 기반 컴파일러 코드베이스의 마지막 주요 버전이다. 다음 주요 버전인 TypeScript 7.0은 Go로 처음부터 다시 쓴다. 코드명 Project Corsa.

이 두 이슈는 서로 다른 일정에서 팀에 영향을 준다. TS 6.0의 breaking changes는 지금 당장 팀의 CI를 깨뜨릴 수 있고, Go 리라이트는 앞으로 수년에 걸쳐 툴체인 전체에 영향을 준다. 두 가지를 같이 이해해야 대응 계획을 세울 수 있다.

TypeScript는 2012년 내부 코드명 "Strada"로 시작됐다. 당시 Microsoft가 JavaScript로 TypeScript 컴파일러를 작성한 건 의도적 선택이었다. TypeScript를 쓰는 개발자들이 컴파일러 코드도 읽고 기여할 수 있게 하려는 목적이었다. 그 결과 14년간 수천 명이 컴파일러 코드를 읽고 PR을 열었다. 그 코드베이스가 이제 수명을 다한다. 새 코드명 Corsa, 새 언어 Go로 이어진다.

## TypeScript 6.0 Breaking Changes

### strict 기본값 전환

`tsconfig.json`에 `strict`를 명시하지 않아도 이제 strict mode가 켜진다. 기존에 `strict: false`로 암묵적으로 동작하던 기존 코드베이스라면, 업그레이드 직후 수십 개에서 수백 개의 타입 오류가 갑자기 드러날 수 있다. 대부분은 `any`로 감춰져 있던 타입 불일치다. 오류를 일괄 억제하는 대신, 이번 기회에 `any` 사용처를 정리하는 게 장기적으로 낫다.

### CommonJS → ESM 기본값

`module`과 `moduleResolution` 기본값이 각각 `esnext`와 `bundler`로 전환된다. Node.js 서버사이드 코드나 CommonJS를 전제한 라이브러리는 명시적으로 설정해야 한다.

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node16"
  }
}
```

`"type": "module"`을 `package.json`에 넣은 프로젝트는 이미 ESM 기반이라 영향이 적다. 문제가 되는 건 아직 CJS에 머물러 있으면서 `tsconfig`를 건드리지 않은 프로젝트들이다.

### 구형 기능 제거

세 가지가 완전히 사라진다.

- `--outFile`: 모든 파일을 단일 번들로 합치는 옵션. esbuild, Rollup, Webpack이 이 역할을 오래전에 대체했다. 아직 이 옵션을 쓰는 팀이라면 번들러 전환이 선행 조건이 된다
- AMD, UMD, SystemJS 모듈 포맷: 2012년대 브라우저 모듈 시스템이다. 현대 환경에서 새로 작성할 이유가 없다. 기존 빌드 파이프라인에 남아있다면 이번에 정리할 때가 됐다
- Classic module resolution: `"moduleResolution": "classic"`은 TypeScript 초기 설정이다. `node`, `node16`, `bundler` 중 하나로 전환해야 한다

### @types 자동 탐색 제거

이전까지 TypeScript는 `node_modules/@types` 아래 설치된 패키지를 자동으로 타입 선언에 포함했다. TS 6.0부터는 `tsconfig.json`의 `types` 필드에 명시한 것만 포함한다.

```json
{
  "compilerOptions": {
    "types": ["node", "jest", "react"],
    "rootDir": "./src"
  }
}
```

자동 탐색에 의존했다면 어떤 `@types` 패키지가 암묵적으로 들어왔는지 파악이 안 돼 있을 수 있다. 업그레이드 후 `@types/*` 패키지 목록을 한번 점검하고 실제로 필요한 것만 `types`에 추가하면 된다. 오히려 타입 의존성이 명시적으로 관리되는 이점이 있다.

### import assert → import with

JSON import assertion 문법이 교체됐다.

```typescript
// TS 5.x (deprecated)
import data from "./data.json" assert { type: "json" };

// TS 6.0 (required)
import data from "./data.json" with { type: "json" };
```

`assert` 키워드를 쓴 코드는 컴파일 오류가 난다. 공식 변환 도구가 자동으로 처리해준다.

### 자동 변환 도구

```bash
npx @andrewbranch/ts5to6
```

`import assert`, 제거된 옵션 정리 등 기계적으로 처리 가능한 변경은 이 CLI가 자동화한다. 실행 후 남은 오류는 `strict: true` 전환으로 드러난 실질적인 타입 문제일 가능성이 높다.

## Project Corsa: 왜 Go인가

TypeScript 7.0의 기반이 될 Go 컴파일러, 코드명 Project Corsa는 2025년 3월 Microsoft가 공식 발표했다. Anders Hejlsberg가 직접 글을 올렸다.

공식 벤치마크는 이렇다.

| 코드베이스 | 규모 | 현재(JS) | 네이티브(Go) | 속도 향상 |
|---|---|---|---|---|
| VS Code | 1,505,000 LOC | 77.8s | 7.5s | 10.4x |
| Playwright | 356,000 LOC | 11.1s | 1.1s | 10.1x |
| TypeORM | 270,000 LOC | 17.5s | 1.3s | 13.5x |
| date-fns | 104,000 LOC | 6.5s | 0.7s | 9.5x |
| tRPC | 18,000 LOC | 5.5s | 0.6s | 9.1x |

수치는 실측이다. Google, Meta, Microsoft처럼 수백만 줄의 모노레포를 운영하는 곳에서 타입 체킹에만 10~20분 씩 쓰던 CI가 1~2분으로 줄어드는 건 팀의 피드백 루프를 완전히 다른 수준으로 만든다.

JavaScript의 근본적 한계는 단일 스레드다. 현재 TypeScript 컴파일러는 CPU 코어 하나만 쓸 수 있다. Go는 멀티스레딩이 기본이다. 코어가 많을수록 이 차이는 커진다.

Rust가 아닌 Go를 고른 이유는 명확하다. TypeScript 컴파일러의 내부 구조, 알고리즘, 최적화를 최대한 그대로 옮기는 게 목표였다. Go의 문법이 TypeScript와 가장 가깝다. 반면 Rust는 소유권 모델과 라이프타임 때문에 데이터 구조와 뮤테이션 방식을 근본적으로 다시 설계해야 한다. 포팅이 아니라 재설계가 된다. Microsoft는 속도보다 안전한 이행을 택했다.

에디터 성능도 같이 올라간다. VS Code 기준 프로젝트 로드 시간이 9.6초 → 1.2초(8배), 메모리 사용량은 현재 대비 절반 수준이 예상된다. 자동완성, 타입 추론, 참조 찾기 같은 언어 서비스 응답속도도 전반적으로 개선된다.

TypeScript 팀은 이 작업을 "재설계"가 아닌 "포팅"으로 정의한다. 타입 시스템의 의미론, 기존 동작, 최적화를 그대로 보존하는 게 목표다. 새 컴파일러는 현재 JS 컴파일러와 같은 타입 체킹 결과를 내야 한다. 이 기준이 지켜지지 않으면 TS 7.0으로 이행하는 프로젝트에서 기존에 없던 타입 오류가 발생하거나, 반대로 있어야 할 오류가 사라지는 회귀가 생길 수 있다. 포팅을 리라이트와 다르게 취급하는 이유가 여기 있다.

## 리스크와 논쟁

### Evan You의 WASM 경고

Go 리라이트의 가장 날카로운 지적은 Vue.js, Vite 창시자인 Evan You에게서 나왔다. 그가 제기한 문제는 WebAssembly 성능다.

CodeSandbox, StackBlitz, GitHub Codespaces 같은 브라우저 기반 개발 환경은 TypeScript 컴파일러를 WASM으로 실행한다. 서버가 없어도 브라우저 안에서 타입 체킹이 돌아가야 하기 때문이다. 그런데 Go를 WASM으로 컴파일하면 Go 런타임이 통째로 번들에 들어간다. 이 부담이 크다. Evan You의 테스트에서 단순한 타입 체킹이 현재 JS 구현보다 느렸다.

네이티브 바이너리로 10배 빠른 컴파일러가 브라우저 환경에선 오히려 퇴보할 수 있다. 이건 단순한 이론적 우려가 아니다. 웹 기반 개발 도구 시장이 실질적으로 영향받는 문제다.

Rust라면 어땠을까. Rust는 WASM 출력물 크기가 Go보다 훨씬 작고, 런타임 부담이 없다. 웹 기반 툴링을 고려했을 때 Rust가 더 나은 선택이었을 수 있다. 하지만 앞서 말했듯 Rust 이행은 포팅이 아닌 재설계가 된다는 게 Microsoft의 판단이었다.

### Joel Spolsky의 재작성 법칙

소프트웨어 업계에 오래된 경고가 있다. Joel Spolsky가 2000년에 쓴 "전체 재작성은 회사가 저지를 수 있는 최악의 전략적 실수"다. 그가 든 사례는 Netscape였다. 버전 4.0에서 6.0으로 가면서 브라우저를 처음부터 다시 쓰는 데 3년이 걸렸고, 그 사이 IE가 시장을 빼앗아 갔다.

Microsoft의 반론은 합리적이다. 이건 재설계가 아닌 포팅이고, JS 기반 6.x 계열은 7.0이 안정화될 때까지 병행 유지된다. 그러나 아무리 포팅이라도 14년 치 JavaScript 코드가 Go로 옮겨지는 과정에서 미묘한 동작 차이는 발생할 수 있다. 이런 종류의 버그는 광범위한 실사용 후에야 발견된다.

최근의 성공 사례도 있다. Discord는 Go 서비스를 Rust로 다시 써서 GC 정지로 인한 지연 문제를 없앴다. Dropbox는 Python 오케스트레이션은 유지하면서 연산 집약 부분만 Rust로 교체했다. TypeScript의 경우 동기는 명확하다. 대형 코드베이스에서 빌드 시간 단축은 측정 가능한 개발자 생산성 향상이다.

Netscape 사례와 다른 점이 하나 더 있다. Netscape가 재작성하는 동안 사용자들은 쓸 수 있는 브라우저가 없었다. TypeScript 팀은 6.x 계열을 병행 유지한다. 7.0이 준비될 때까지 팀은 6.x로 계속 작업할 수 있다. 생산적인 병행 구간을 어떻게 관리하느냐가 이번 이행의 성패를 가를 것이다.

### 두 번 연속 업그레이드 부담

현실적인 문제가 있다. TS 6.0 업그레이드를 막 끝낸 팀이 수개월 뒤 TS 7.0을 맞닥뜨린다. 아직 6.0 대응이 끝나지 않은 팀이라면 두 번의 전환이 거의 겹쳐서 온다.

더 깊은 우려는 생태계 파편화다. TypeScript 컴파일러 내부 API에 의존하는 도구들, `ts-loader`, 커스텀 AST 트랜스포머, 고급 플러그인 시스템 등은 TS 7.0과 호환되지 않을 수 있다. 일부 내부 API는 Go 구현에서 아예 사라진다. 이 도구들이 TS 7.0을 지원할 때까지 팀은 6.x 계열에 머물러야 한다.

## 실용적 업그레이드 체크리스트

### TS 6.0 업그레이드

```bash
npm install typescript@6
npx @andrewbranch/ts5to6
```

점검 항목:

1. `tsconfig.json`에 `"types": [...]` 명시. 자동 탐색에 의존했다면 현재 프로젝트에서 `@types/*` 패키지 목록 확인
2. CommonJS를 유지해야 하는 경우 `"module": "commonjs"` 명시
3. `--outFile` 사용 중이라면 번들러 전환이 선행 조건
4. AMD/UMD/SystemJS 포맷 의존 기존 설정 전면 점검
5. `import assert` → `import with` 전환 (CLI가 자동 처리)
6. `strict: true` 전환 후 드러나는 오류는 `as any`로 억제하지 말고 실제 타입을 보완

`target: "es2025"`로 기본값이 바뀌면서 구 브라우저를 지원해야 하는 프로젝트는 명시적으로 `target`을 설정해야 한다. `es2025`는 TypeScript 릴리스마다 자동으로 올라가는 "floating target"이기 때문에, 브라우저 지원 범위를 고정해야 한다면 명시적 값이 필수다.

### 주요 프레임워크 현황

- Vite: 공식 TS 6.0 지원 예정. 현재 베타 테스트 중
- Next.js: Vercel 팀이 대응 중. 공식 업그레이드 가이드 별도 공개 예정
- Nuxt: ESM 기본값 전환과 방향이 같아 상대적으로 영향 적음
- Angular: 자체 TS 버전 지원 정책에 따라 독립적 일정

어떤 프레임워크를 쓰든, 프레임워크 공식 채널에서 TS 6.0 호환 선언이 나오기 전에 프로덕션 업그레이드는 대기하는 게 안전하다. 특히 Next.js처럼 컴파일러와 긴밀하게 맞물린 프레임워크는 상호 의존하는 부분이 많다.

### TS 7.0을 앞두고

TS 7.0이 수개월 내 나온다는 공식 발표가 있다. "지금 6.0으로 전환을 왜 해야 하나, 7.0을 기다리면 안 되나"라는 생각이 들 수 있다. 기다리지 않는 게 낫다. 두 이유가 있다.

첫째, TS 7.0은 breaking changes가 추가로 있을 가능성이 크다. 한 번에 두 버전의 breaking changes를 처리하는 건 6.0 + 7.0을 따로 처리하는 것보다 어렵다. 둘째, TS 7.0 생태계 호환성이 안정되기까지 시간이 걸린다. 7.0이 나와도 실제 프로덕션 적용은 생태계가 따라잡은 뒤다. 그 시간 동안 6.0 기반으로 안정적으로 운영하는 게 현실적이다.

내부 컴파일러 API를 직접 사용하는 도구가 프로젝트에 있다면, 지금 목록을 파악해두는 것이 좋다. TS 7.0 출시 전에 해당 도구들의 호환성 계획을 확인하고, 필요하면 대안을 미리 검토해야 한다. 특히 `ts-loader`, `ts-jest`, 커스텀 트랜스포머, TypeDoc 같은 도구들이 이 범주에 해당한다. 대부분은 TS 7.0 대응 버전을 별도로 릴리스할 것으로 예상하지만, 일정은 각 프로젝트마다 다르다.

## 참고 자료

- [A 10x Faster TypeScript](https://devblogs.microsoft.com/typescript/typescript-native-port/): Microsoft 공식 발표. Project Corsa 배경, 벤치마크, 버저닝 계획
- [TypeScript 6.0 Ends JavaScript Era, Go Rewrite Brings 10x Speed](https://byteiota.com/typescript-6-0-ends-javascript-era-go-rewrite-brings-10x-speed/): TS 6.0 breaking changes 요약과 Go 리라이트 맥락 정리
- [Why Go wasn't the right choice for the TypeScript compiler](https://blog.logrocket.com/go-wrong-choice-typescript-compiler/): Evan You 우려 포함, Go 선택에 대한 반론 시각
- [typescript-go GitHub repo](https://github.com/microsoft/typescript-go): Project Corsa 소스. FAQ와 구현 현황 확인 가능
- [TypeScript 6.0 upgrade guide](https://www.ludiflex.com/blog/typescript-60-what-actually-changed-and-how-to-upgrade-without-pain): 업그레이드 과정에서 실제 맞닥뜨리는 문제와 해결 패턴
