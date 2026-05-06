---
title: "Node.js 22에서 24로: 1분이면 되는 게 아닌 이유"
date: "2026-04-23"
description: "Node.js 20 EOL이 지났다. Node.js 24(Krypton)로 올라가기 전, OpenSSL 3.5가 조용히 당신의 서버를 멈출 수 있다. 어디서 터지는지 미리 알고 대비하는 법."
tags: ["Node.js", "Backend", "DevOps", "Security", "OpenSSL"]
category: "Engineering"
published: true
---
Node.js 20이 2026년 4월 EOL을 맞았다. 지금 20을 쓰고 있다면 선택지가 없다. Node.js 22나 24로 가야 한다.

Node.js 24(코드명 Krypton)는 2025년 10월에 Active LTS가 됐고 2028년 4월까지 지원된다. 새 프로젝트라면 24가 답이다. 기존 22에서 올라오는 팀도 결국 같은 목적지다.

문제는 `nvm use 24`가 전부가 아니라는 점이다.

## OpenSSL 3.5: 조용한 파괴자

Node.js 24에서 가장 위험한 변경은 V8도 아니고 npm 11도 아니다. OpenSSL 3.5다.

OpenSSL 3.5는 **기본 보안 레벨을 1에서 2로 올렸다**. 이게 뭘 의미하냐면:

| 거부 대상 | 이유 |
|---|---|
| 2048비트 미만 RSA/DSA/DH 키 | 보안 레벨 2 미달 |
| 224비트 미만 ECC 키 | 보안 레벨 2 미달 |
| RC4 암호 스위트 | 암호학적으로 파기됨 |
| MD5 서명 (일부 컨텍스트) | 충돌 취약점 |

1024비트 RSA 키를 쓰는 인증서가 붙어 있으면, Node.js 24에서 TLS 연결이 에러를 뱉는다. 에러 메시지는 이렇다:

```
Error: write EPROTO ... routines:ssl_choose_client_version:unsupported protocol
```

혹은:

```
Error: SSL routines::ee key too small
```

### 어디서 터지나

직접 관리하는 인증서는 금방 잡는다. 문제는 눈에 잘 안 띄는 곳이다.

- **내부 PKI**: 오래된 사내 CA는 1024비트 RSA를 쓰는 경우가 흔하다
- **IoT 연동**: 임베디드 장비는 CPU 절약을 위해 약한 키를 쓰는 게 관행이었다
- **레거시 외부 API**: 몇 년 된 서드파티 서비스 중 인프라를 안 바꾼 곳이 있다
- **개발용 자체 서명 인증서**: `openssl req -newkey rsa:1024`으로 만들어 놓고 잊어버린 것들

### 사전 점검

업그레이드 전에 먼저 확인한다:

```bash
# 인증서 키 길이 확인
openssl x509 -in your-cert.pem -noout -text | grep "Public-Key"
# (1024 bit) 나오면 즉시 재발급 필요

# Node.js 24 환경에서 실제 연결 테스트
node -e "
const https = require('https');
https.get('https://your-internal-api.com', (res) => {
  console.log('OK:', res.statusCode);
}).on('error', (e) => console.error('FAILED:', e.message));
"
```

연결되는 모든 엔드포인트에 돌려봐야 한다. 자체 서버뿐 아니라 호출하는 외부 API도 포함해서.

### 임시 우회 (프로덕션 금지)

인증서 재발급 전에 원인을 확인해야 할 때만 쓴다:

```javascript
const https = require('https');

const agent = new https.Agent({
  ciphers: 'DEFAULT@SECLEVEL=1'
});

// 이 agent로 연결하면 보안 레벨 1로 다운그레이드
https.get('https://legacy-endpoint.com', { agent }, (res) => {
  console.log(res.statusCode);
});
```

진단 도구다. 프로덕션에 들어가면 안 된다.

### 포스트 퀀텀 암호화

OpenSSL 3.5의 긍정적인 면도 있다. NIST 표준 포스트 퀀텀 알고리즘(ML-KEM, ML-DSA)이 탑재됐다. Node.js 24가 처음으로 이걸 쓸 수 있는 LTS다. 금융, 의료 같은 규제 산업에서 장기 보안 요건을 따져야 한다면 지금부터 준비할 수 있다.

## V8 13.6: 라이브러리 덜어내기

V8이 13.6으로 올라가면서 직접 쓸 수 있는 게 늘었다.

### Iterator Helpers

lodash나 iterare 없이 이터레이터 조작이 된다:

```javascript
// 이전: lodash 또는 커스텀 코드
const result = _.chain([1, 2, 3, 4, 5])
  .filter(n => n % 2 === 0)
  .map(n => n * 10)
  .value();

// Node.js 24: 네이티브 Iterator Helpers
const result = [1, 2, 3, 4, 5]
  .values()
  .filter(n => n % 2 === 0)
  .map(n => n * 10)
  .toArray();
// → [20, 40]
```

배열뿐 아니라 Set, Map, 제너레이터 함수 등 모든 이터러블에 된다.

### URLPattern 안정화

`path-to-regexp`를 대체할 웹 표준 API가 안정화됐다:

```javascript
// 이전: path-to-regexp
const { pathToRegexp } = require('path-to-regexp');
const re = pathToRegexp('/user/:id');

// Node.js 24: URLPattern (import 불필요)
const pattern = new URLPattern({ pathname: '/user/:id' });
pattern.test('https://example.com/user/42'); // true

const match = pattern.exec('https://example.com/user/42');
match.pathname.groups.id; // '42'
```

라우팅에서 외부 라이브러리 의존성을 하나 줄일 수 있다.

### 추가된 글로벌

`Float16Array`, `CloseEvent` 등이 글로벌에 추가됐다. 이걸 폴리필하고 있었다면 제거해야 한다. 중복 정의로 예상치 못한 동작이 나올 수 있다.

## 제거된 API

### `util.is*()` 메서드

Node.js 4부터 deprecated였던 메서드들이 최종 제거됐다:

```javascript
// 제거됨 → 대체
util.isArray(val)           // Array.isArray(val)
util.isBoolean(val)         // typeof val === 'boolean'
util.isBuffer(val)          // Buffer.isBuffer(val)
util.isDate(val)            // val instanceof Date
util.isError(val)           // val instanceof Error
util.isFunction(val)        // typeof val === 'function'
util.isNull(val)            // val === null
util.isNullOrUndefined(val) // val == null
util.isNumber(val)          // typeof val === 'number'
util.isString(val)          // typeof val === 'string'
util.isUndefined(val)       // val === undefined
```

코드베이스 검색:

```bash
grep -r "util\.is" src/ --include="*.js" --include="*.ts" \
  | grep -v "util.inspect\|util.isDeepEqual\|util.isNativeError"
```

### `tls.createSecurePair()`

Node.js 0.11부터 deprecated. `tls.TLSSocket`으로 교체한다:

```javascript
// 제거됨
const pair = tls.createSecurePair(context, isServer);

// 대체
const tlsSocket = new tls.TLSSocket(socket, {
  secureContext: context,
  isServer
});
```

### `fs.truncate(fd, ...)`

파일 디스크립터를 받는 시그니처가 제거됐다:

```javascript
// 제거됨
fs.truncate(fd, len, callback);

// 대체
fs.ftruncate(fd, len, callback);
```

## 마이그레이션 체크리스트

순서가 있다. OpenSSL 먼저, API 제거 나중이다.

**1단계: TLS 감사**
- [ ] 서버 인증서 키 길이 확인 (`openssl x509 -text | grep Public-Key`)
- [ ] 연결하는 모든 외부/내부 API 엔드포인트 테스트
- [ ] 2048비트 미만 RSA 인증서 재발급
- [ ] IoT 장비, 레거시 클라이언트 인증서 점검

**2단계: 제거된 API 확인**
- [ ] `util.is*()` 사용처 grep 후 교체
- [ ] `tls.createSecurePair()` 사용처 확인
- [ ] `fs.truncate(fd, ...)` 사용처 `ftruncate`로 교체
- [ ] `url.parse()` 런타임 deprecation 경고 확인 (아직 제거 전이지만 대비)

**3단계: CI 매트릭스 추가**
```yaml
# .github/workflows/test.yml
strategy:
  matrix:
    node: [22, 24]
```

**4단계: 의존성 점검**
```bash
npm outdated
# 네이티브 애드온 있으면 V8 13.6 호환성 별도 확인
```

**5단계: `.nvmrc` 업데이트**
```bash
echo "24" > .nvmrc
```

## Node.js 20에서 올라오는 경우

22를 거치지 않고 바로 24로 가도 된다. 단, 20→22→24 순으로 변경사항을 추적하는 게 디버깅할 때 편하다. Node.js 22에서 이미 deprecated 경고가 뜬 API들이 24에서 제거됐기 때문에, 22로 먼저 올려서 경고를 잡으면 24 이전이 깨끗해진다.

---

## 참고 자료

- [Node.js 24.0.0 Release Notes](https://nodejs.org/en/blog/release/v24.0.0) — 공식 릴리즈 노트, semver-major 변경사항 전체 목록
- [Node.js 24 LTS: Upgrade from Node 22 in 2026 — PkgPulse](https://www.pkgpulse.com/blog/nodejs-24-lts-upgrade-from-node-22-2026) — 실전 업그레이드 가이드, OpenSSL 3.5 상세 분석
- [What's New in Node.js 24 — NodeSource](https://nodesource.com/blog/Node.js-version-24/) — 기능 요약 및 기업 사용 관점 분석
