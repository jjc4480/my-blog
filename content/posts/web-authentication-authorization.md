---
title: '웹 인증과 인가: Basic Auth부터 Passkey까지'
date: 2026-04-14
description: 인증과 인가의 차이부터 세션, JWT, OAuth2, Passkey까지. 웹 보안의 핵심 개념을 코드와 함께 정리한다.
tags: [authentication, authorization, jwt, oauth2, session, passkey, security]
slug: web-authentication-authorization
category: engineering
published: true
---

웹 서비스를 만들면 가장 먼저 부딪히는 문제가 있다. "이 요청을 보낸 사람이 누구인지 어떻게 알지?" 그리고 바로 뒤따르는 질문. "이 사람이 이 작업을 해도 되는 건지 어떻게 판단하지?"

이 두 질문이 바로 인증(Authentication)과 인가(Authorization)다. 비슷해 보이지만 완전히 다른 문제이고, 혼동하면 보안 구멍이 생긴다. 두 개념의 차이부터 시작해서, 웹에서 쓰이는 주요 인증/인가 방식을 코드와 함께 정리해봤다.

## 인증 vs 인가

**인증(Authentication)**은 신원 확인이다. 공항에서 여권을 보여주는 것과 같다. "이 사람이 장종찬이 맞는가?"

**인가(Authorization)**는 권한 확인이다. 비행기 탑승구에서 보딩패스를 보여주는 것과 같다. "이 사람이 이 비행기에 탈 수 있는가?"

HTTP 응답 코드로 보면 명확하다.

-   **401 Unauthorized**: 인증 실패. 누군지 모르겠다. 로그인부터 해라.
    
-   **403 Forbidden**: 인가 실패. 누군지는 알지만, 이 작업을 할 권한이 없다.
    

이름이 헷갈리는데, 401의 이름이 "Unauthorized"인 건 HTTP 스펙의 역사적 실수에 가깝다. 실제로는 "Unauthenticated"가 더 정확하다.

인증이 먼저, 인가가 그 다음이다. 누군지 모르면 권한을 확인할 수도 없다.

## Basic Auth & Digest Auth

### Basic Auth

HTTP 인증의 가장 원시적인 형태다. 사용자 ID와 비밀번호를 Base64로 인코딩해서 매 요청마다 보낸다.

```typescript
// Basic Auth 헤더 구성
const username = "admin";
const password = "secret123";
const credentials = btoa(`${username}:${password}`);

const response = await fetch("https://api.example.com/users", {
  headers: {
    Authorization: `Basic ${credentials}`,
  },
});
```

Base64는 **인코딩이지 암호화가 아니다.** `atob()`으로 누구나 원문을 복원할 수 있다. HTTPS 없이 Basic Auth를 쓰면 비밀번호가 평문으로 돌아다니는 것과 같다.

### Digest Auth

Basic Auth의 보안 문제를 개선한 방식이다. 비밀번호를 직접 전송하지 않고, 해시값을 보낸다.

서버가 nonce(일회용 랜덤 값)를 보내면, 클라이언트가 `MD5(username:realm:password:nonce:...)`를 계산해서 전송한다. 비밀번호 원본은 네트워크를 타지 않는다.

하지만 MD5 자체가 더 이상 안전하지 않고, 레인보우 테이블 공격에 취약하다. 현재는 Basic Auth, Digest Auth 모두 레거시 취급이다. 새 프로젝트에서 쓸 이유가 없다.

## API Key

API Key는 사용자가 아닌 **앱이나 서비스를 식별**하는 방식이다.

```typescript
// API Key를 헤더에 포함
const response = await fetch("https://api.weather.com/forecast", {
  headers: {
    "X-API-Key": "sk-abc123def456",
  },
});
```

구글 맵 API, 스트라이프 결제 API 같은 B2B 연동에서 주로 쓴다. 발급받은 키를 요청에 넣으면 서버가 "이 요청은 어느 서비스에서 온 건지" 식별한다.

다만 주의할 게 있다.

-   프론트엔드 코드에 API Key를 넣으면 안 된다. 브라우저 개발자 도구에서 바로 보인다.
    
-   키가 유출되면 즉시 재발급해야 한다. 비밀번호처럼 로테이션 정책이 필요하다.
    
-   API Key는 "누가 호출했는가"를 식별하지만, "그 사람이 누구인가"를 인증하지는 않는다.
    

API Key는 인증이라기보다는 **식별(Identification)**에 가깝다. 사용자 로그인과는 별개의 문제다.

## 세션 기반 인증

웹에서 가장 오래되고 직관적인 인증 방식이다. 흐름은 단순하다.

1.  사용자가 ID/PW로 로그인한다
    
2.  서버가 세션을 생성하고 세션 ID를 발급한다
    
3.  세션 ID를 쿠키에 담아 브라우저에 보낸다
    
4.  이후 요청마다 브라우저가 쿠키를 자동으로 전송한다
    
5.  서버가 세션 ID로 사용자를 식별한다
    

```typescript
import express from "express";
import session from "express-session";

const app = express();

app.use(
  session({
    secret: "my-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1일
    },
  })
);

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = authenticate(username, password);

  if (user) {
    req.session.userId = user.id;
    res.json({ message: "로그인 성공" });
  } else {
    res.status(401).json({ message: "인증 실패" });
  }
});

app.get("/profile", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "로그인 필요" });
  }
  const user = findUser(req.session.userId);
  res.json(user);
});
```

쿠키에는 보안 옵션이 몇 가지 있다. 반드시 설정해야 하는 것들이다.

| 옵션 | 역할 |
|---|---|
| `httpOnly` | JavaScript에서 쿠키 접근 차단. XSS 공격 방어 |
| `secure` | HTTPS에서만 쿠키 전송 |
| `sameSite: "strict"` | 다른 사이트에서 보내는 요청에 쿠키 미포함. CSRF 방어 |
| `sameSite: "lax"` | GET 요청은 허용, POST는 차단. 가장 실용적인 기본값 |
| `sameSite: "none"` | 크로스 사이트 허용. `secure` 필수 |

세션 기반 인증의 가장 큰 한계는 **서버가 상태를 가진다**는 점이다. 서버가 한 대일 때는 문제 없지만, 서버를 여러 대 띄우면 세션을 공유해야 한다. Redis 같은 외부 저장소를 세션 스토어로 쓰는 게 일반적이다.

모바일 앱에서도 쿠키 관리가 번거롭다. 그래서 나온 게 토큰 기반 인증이다.

## JWT (JSON Web Token)

JWT는 서버가 상태를 저장하지 않는 토큰 기반 인증 방식이다. 세션처럼 서버에 데이터를 보관하는 대신, 필요한 정보를 토큰 자체에 담는다.

JWT는 세 부분으로 구성된다. 점(.)으로 구분한다.

```text
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature
|--- Header ---|--- Payload ---|--- Signature ---|
```

-   **Header**: 서명 알고리즘 (HS256, RS256 등)
    
-   **Payload**: 사용자 정보 (sub, exp, iat 등의 클레임)
    
-   **Signature**: Header + Payload를 비밀키로 서명한 값
    

```typescript
import jwt from "jsonwebtoken";

const SECRET = "my-secret-key";

// JWT 생성
function createToken(userId: string): string {
  return jwt.sign(
    { sub: userId, role: "admin" },
    SECRET,
    { expiresIn: "1h" }
  );
}

// JWT 검증
function verifyToken(token: string) {
  try {
    const payload = jwt.verify(token, SECRET);
    return payload;
  } catch (err) {
    return null; // 만료되었거나 위변조된 토큰
  }
}

// 미들웨어에서 사용
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "토큰 없음" });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ message: "유효하지 않은 토큰" });
  }

  req.user = payload;
  next();
}
```

JWT에 대해 가장 흔한 오해가 하나 있다. **JWT는 암호화가 아니다.** Payload는 Base64URL로 인코딩된 것일 뿐, 누구나 디코딩해서 내용을 볼 수 있다. JWT가 보장하는 건 **무결성**, 즉 "이 토큰이 위변조되지 않았다"는 것뿐이다. 민감한 정보(비밀번호, 카드번호)를 Payload에 넣으면 안 된다.

## Access Token & Refresh Token

JWT를 실제 서비스에 적용하면 바로 딜레마에 부딪힌다. 토큰 유효기간을 길게 잡으면 보안 위험이 커지고, 짧게 잡으면 사용자가 자주 로그인해야 한다.

Access Token과 Refresh Token을 나눠서 쓰는 패턴이 이걸 해결한다.

-   **Access Token**: API 호출에 사용. 유효기간이 짧다 (15분~1시간).
    
-   **Refresh Token**: Access Token 재발급용. 유효기간이 길다 (7일~30일).
    

```typescript
import jwt from "jsonwebtoken";

const ACCESS_SECRET = "access-secret";
const REFRESH_SECRET = "refresh-secret";

// 토큰 쌍 발급
function issueTokens(userId: string) {
  const accessToken = jwt.sign(
    { sub: userId },
    ACCESS_SECRET,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { sub: userId },
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
}

// Access Token 재발급
app.post("/refresh", (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh Token 없음" });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const newAccessToken = jwt.sign(
      { sub: payload.sub },
      ACCESS_SECRET,
      { expiresIn: "15m" }
    );
    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ message: "Refresh Token 만료" });
  }
});

// 로그인 시 토큰 발급
app.post("/login", (req, res) => {
  const user = authenticate(req.body);
  if (!user) return res.status(401).end();

  const { accessToken, refreshToken } = issueTokens(user.id);

  // Refresh Token은 HttpOnly 쿠키에 저장
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Access Token은 응답 바디로 전달 (클라이언트가 메모리에 보관)
  res.json({ accessToken });
});
```

저장 위치가 중요하다.

-   **Access Token**: 클라이언트 메모리(JavaScript 변수)에 저장. `localStorage`에 넣으면 XSS로 탈취될 수 있다.
    
-   **Refresh Token**: `HttpOnly` 쿠키에 저장. JavaScript에서 접근 불가하므로 XSS에 안전하다.
    

Access Token이 만료되면 클라이언트가 `/refresh` 엔드포인트를 호출해서 새 Access Token을 받는다. 사용자는 로그인을 다시 할 필요가 없다. Refresh Token까지 만료되면 그때 재로그인이 필요하다.

## Passkey

비밀번호의 근본적 문제는 "사람이 관리해야 한다"는 점이다. 기억하기 어렵고, 재사용하고, 피싱에 당한다. Passkey는 비밀번호 자체를 없애는 방향으로 접근한다.

Passkey는 **공개키 암호화(Public Key Cryptography)** 기반이다.

1.  등록 시: 기기가 공개키/비밀키 쌍을 생성한다. 비밀키는 기기에만 저장되고, 공개키를 서버에 보낸다.
    
2.  로그인 시: 서버가 챌린지(랜덤 값)를 보내면, 기기가 비밀키로 서명해서 응답한다.
    
3.  서버가 공개키로 서명을 검증한다. 검증되면 로그인 성공.
    

비밀키는 기기 밖으로 나가지 않는다. Face ID, 지문, PIN으로 비밀키 사용을 승인할 뿐이다.

비밀번호랑 비교해보면 차이가 크다.

| | 비밀번호 | Passkey |
|---|---|---|
| 피싱 | 가짜 사이트에 입력 가능 | 도메인에 바인딩되어 불가 |
| 유출 | 서버 DB 해킹 시 위험 | 서버에 공개키만 있어서 무의미 |
| 재사용 | 여러 사이트에 같은 비밀번호 | 사이트마다 고유 키 쌍 생성 |
| 사용성 | 기억해야 함 | 생체인증으로 한 번에 처리 |

아직 모든 서비스에서 지원하는 건 아니지만, 구글, 애플, 마이크로소프트가 적극적으로 밀고 있다. 비밀번호를 대체하는 방향으로 가고 있다.

## OAuth2 & OIDC

### OAuth2: 권한 위임

"구글 계정으로 로그인" 버튼을 눌러본 적이 있을 것이다. 이 뒤에서 동작하는 게 OAuth2다.

OAuth2는 **인증 프로토콜이 아니라 인가(권한 위임) 프레임워크**다. "이 앱이 내 구글 캘린더를 읽어도 된다"처럼, 제3자에게 특정 권한을 위임하는 표준이다.

가장 많이 쓰이는 Authorization Code 흐름은 이렇다.

1.  사용자가 "구글로 로그인" 클릭
    
2.  구글 로그인 페이지로 리다이렉트
    
3.  사용자가 동의(이메일, 프로필 정보 접근 등)
    
4.  구글이 인가 코드(Authorization Code)를 콜백 URL로 전달
    
5.  서버가 인가 코드를 구글에 보내서 Access Token으로 교환
    
6.  Access Token으로 구글 API(사용자 정보 등)를 호출
    

```typescript
import express from "express";

const app = express();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = "http://localhost:3000/callback";

// 1단계: 구글 로그인 페이지로 리다이렉트
app.get("/login/google", (req, res) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// 2단계: 인가 코드를 Access Token으로 교환
app.get("/callback", async (req, res) => {
  const { code } = req.query;

  // 인가 코드 → 토큰 교환
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: code as string,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const { access_token, id_token } = await tokenResponse.json();

  // 3단계: Access Token으로 사용자 정보 조회
  const userResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  const user = await userResponse.json();
  // user: { id, email, name, picture }

  // 여기서 세션 생성 또는 자체 JWT 발급
  res.json({ user });
});
```

동의 화면에서 요구하는 정보 범위를 **Scope**라고 한다. `email`, `profile`, `calendar.readonly` 같은 것들이다. 사용자는 어떤 정보를 공유할지 직접 선택할 수 있다.

### OIDC: OAuth2 + 인증

OAuth2 자체는 "이 토큰으로 API를 호출할 수 있다"는 인가만 담당한다. "이 사람이 누구인지"를 알려주는 표준이 없다.

OIDC(OpenID Connect)는 OAuth2 위에 **인증 레이어를 추가**한 확장이다. Access Token 외에 **ID Token**(JWT 형식)을 추가로 발급한다.

ID Token에는 사용자 정보(sub, email, name 등)가 들어있다. 서버가 구글 API를 따로 호출하지 않아도 ID Token만 검증하면 사용자를 식별할 수 있다.

```typescript
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

// 구글의 공개키로 ID Token 검증
const client = jwksClient({
  jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
});

async function verifyIdToken(idToken: string) {
  const decoded = jwt.decode(idToken, { complete: true });
  const key = await client.getSigningKey(decoded!.header.kid);
  const publicKey = key.getPublicKey();

  return jwt.verify(idToken, publicKey, {
    audience: GOOGLE_CLIENT_ID,
    issuer: "https://accounts.google.com",
  });
}
```

차이를 표로 보면 바로 보인다.

| | OAuth2 | OIDC |
|---|---|---|
| 목적 | 권한 위임 (인가) | 사용자 인증 + 권한 위임 |
| 발급 토큰 | Access Token | Access Token + ID Token |
| 사용자 정보 | API 호출 필요 | ID Token에 포함 |

"소셜 로그인"을 구현한다면 OIDC를 쓰는 것이다. OAuth2만으로는 "이 사람이 누구인지"를 표준적으로 알 수 없다.

## SSO & Keycloak

### SSO (Single Sign-On)

SSO는 한 번 로그인하면 연결된 여러 서비스에 자동으로 접근하는 방식이다. 구글 계정 하나로 Gmail, YouTube, Google Drive에 전부 로그인되는 것이 대표적인 예다.

SSO를 구현하는 표준은 두 가지가 있다.

| | SAML | OIDC |
|---|---|---|
| 등장 | 2005년 | 2014년 |
| 포맷 | XML | JSON |
| 토큰 | SAML Assertion | JWT (ID Token) |
| 주 사용처 | 엔터프라이즈 | 웹/모바일 |
| 복잡도 | 높다 | 상대적으로 낮다 |

새 프로젝트라면 OIDC를 선택하는 게 합리적이다. SAML은 레거시 엔터프라이즈 시스템과 연동할 때 어쩔 수 없이 쓰게 된다.

### Keycloak

[Keycloak](https://www.keycloak.org/)은 오픈소스 인증/인가 서버다. 직접 인증 시스템을 구축하는 대신, Keycloak이 이 모든 걸 처리한다.

-   소셜 로그인 (Google, GitHub, Apple 등)
    
-   SSO (OIDC, SAML)
    
-   MFA (다중 인증)
    
-   JWT 발급 및 검증
    
-   사용자 관리 콘솔
    
-   역할 기반 접근 제어 (RBAC)
    

인증 시스템을 직접 만드는 건 생각보다 범위가 넓다. 로그인/로그아웃, 비밀번호 재설정, 이메일 인증, 소셜 로그인, 토큰 관리, 세션 관리, 보안 정책... 이걸 전부 직접 구현하면 핵심 비즈니스 로직에 쓸 시간이 줄어든다.

Keycloak 같은 전용 솔루션을 두고 앱 서버는 토큰 검증만 하는 구조가 실무에서는 훨씬 현실적이다. 인증이라는 관심사를 별도 서비스로 분리하는 셈이다.

## 전체 흐름 정리

| 방식 | 용도 | 상태 관리 | 현재 권장 |
|---|---|---|---|
| Basic/Digest Auth | HTTP 기본 인증 | 없음 (매 요청 전송) | 레거시 |
| API Key | 앱/서비스 식별 | 없음 | B2B 연동 시 |
| 세션 | 웹 로그인 | 서버 (stateful) | 전통적 웹 |
| JWT | API 인증 | 클라이언트 (stateless) | API/SPA/모바일 |
| Passkey | 차세대 로그인 | 기기 (비밀키) | 점진적 도입 |
| OAuth2/OIDC | 소셜 로그인, SSO | 인증 서버 | 표준 |

뭘 쓸지는 서비스 성격에 따라 다르다. 전통적인 서버 렌더링 웹이라면 세션이 가장 간단하다. SPA나 모바일 앱이라면 JWT. 여러 서비스를 운영한다면 OAuth2/OIDC 기반 SSO. 그리고 이 모든 걸 직접 구현하기보다는, Keycloak이나 Auth0 같은 검증된 솔루션 위에서 시작하는 게 현실적이다.

보안은 직접 만들수록 구멍이 생기기 쉽다. 검증된 도구를 쓰되, 내부 동작은 이해하고 있어야 문제가 생겼을 때 대응할 수 있다.

## 참고 자료

    
-   [RFC 6749: The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749) - OAuth2 공식 스펙
    
-   [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) - OIDC 공식 스펙
    
-   [Web Authentication: An API for accessing Public Key Credentials](https://www.w3.org/TR/webauthn-3/) - WebAuthn(Passkey) W3C 표준
    
-   [Keycloak Documentation](https://www.keycloak.org/documentation) - Keycloak 공식 문서