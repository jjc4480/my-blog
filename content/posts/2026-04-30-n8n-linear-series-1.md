---
title: "[시리즈 1] n8n + Linear 도입기 — 개발팀 워크플로우를 자동화하는 첫 걸음"
date: "2026-04-30"
published: false
category: "트렌드"
tags: ["n8n", "linear", "automation", "workflow", "self-hosted", "developer-tools"]
description: "Zapier 대신 n8n을, Jira 대신 Linear를 고른 이유. Docker로 n8n을 띄우고 GitHub PR을 Linear 이슈에 자동 연결하기까지 실제로 겪은 시행착오를 기록한다."
---
개발팀 워크플로우 자동화를 시작하면서 두 가지 결정을 동시에 내렸다. 자동화 플랫폼은 n8n, 이슈 트래커는 Linear. 둘 다 이미 쓰는 팀이 많았지만 우리 팀은 처음이었다. 이 글은 왜 골랐는지, 어떻게 세팅했는지, 어디서 막혔는지를 순서대로 적은 기록이다. 튜토리얼이 아니라 도입 경험기다.

## 왜 n8n인가

Zapier와 Make(구 Integromat)로 시작하지 않은 이유는 단순하다. 비용과 데이터 주권.

Zapier는 태스크 수 기반 요금제다. 자동화가 복잡해질수록, 실행 횟수가 늘어날수록 비용이 선형으로 올라간다. 소규모 팀이 단순한 알림 자동화 정도에 쓰기에는 괜찮지만, 슬랙 메시지 하나하나를 DB에 쌓거나 PR 이벤트마다 여러 단계를 거치는 워크플로우를 만들면 금방 한계가 온다. Make는 Zapier보다 유연하고 요금도 합리적이지만, 구조가 복잡해지면 시각적 편집기가 오히려 관리를 어렵게 만든다는 느낌을 받았다.

n8n은 self-hosted로 돌리면 실행량 제한이 없다. 서버 비용만 내면 된다. 우리 팀은 이미 VPS를 운영하고 있었으니 추가 비용이 거의 없었다. n8n Cloud를 쓰면 매달 요금이 나오지만, Docker로 직접 띄우는 경로가 있기 때문에 선택의 여지가 있다.

데이터 주권도 이유 중 하나였다. 슬랙 메시지, PR 코멘트, 내부 이슈 데이터가 제3자 SaaS 서버를 통과하는 게 불편하다. 아직 규제 요건이 빡빡하지 않더라도, 사내 데이터 흐름을 우리 인프라 안에서만 처리한다는 원칙을 지키고 싶었다. n8n을 직접 띄우면 그게 가능하다.

결정적인 건 Code 노드였다. n8n에는 JavaScript를 직접 실행할 수 있는 Code 노드가 있다. GUI로 노드를 연결하다가 표현할 수 없는 로직이 생기면 코드로 짜면 된다. Zapier의 "Code by Zapier"도 있지만 지원하는 라이브러리가 제한적이고, Make의 커스텀 함수는 표현력이 더 떨어진다. n8n Code 노드는 Node.js 환경에서 `require`로 외부 패키지를 불러올 수도 있다. 개발자 입장에서 막히면 코드로 뚫을 수 있다는 옵션이 있는 것과 없는 것의 차이는 크다.

## 왜 Linear인가

Jira를 안 쓰는 이유를 먼저 말하는 게 빠르다.

Jira는 기능이 많다. 그게 문제다. 스프린트 하나 만들고 이슈 하나 올리는 데 클릭이 너무 많다. 필드도 많고, 설정도 많고, 권한 체계도 복잡하다. 프로젝트 초기에는 그 복잡성이 오히려 방해가 된다. 팀이 10명 이하이고 빠르게 움직여야 할 때, Jira는 오버엔지니어링처럼 느껴졌다.

Linear는 속도가 다르다. 이슈 만들기가 `C` 키 하나다. 제목 쓰고, 담당자 지정하고, 엔터. 5초 안에 끝난다. 화면 전환도 빠르고, 키보드 단축키로 대부분이 가능하다. 처음 써보는 팀원이 15분 만에 "이거 Jira보다 훨씬 낫다"고 했다. 설치도 세팅도 필요 없이 그냥 빠른 툴이다.

GitHub 연동이 기본으로 잘 돼 있다. PR 제목에 이슈 ID를 넣으면, 예를 들어 `FE-123`, Linear가 자동으로 연결한다. PR 상태가 이슈 카드에 바로 보이고, merge되면 이슈 상태도 자동으로 바뀐다. 개발자가 별도로 이슈를 업데이트하지 않아도 흐름이 이어진다. PR을 열고 이슈를 닫는 작업이 두 가지가 아니라 하나처럼 느껴진다.

최근 Linear가 스타트업과 개발팀 사이에서 빠르게 퍼지는 이유 중 하나는 AI 기능이다. 이슈 설명을 자동으로 보강하거나, 비슷한 이슈를 찾아주거나, 우선순위를 제안하는 기능이 붙었다. 아직 완성도가 높지는 않지만, 이슈 트래커가 단순 목록 관리에서 벗어나고 있다는 방향이 맞다. Jira도 비슷한 기능을 추가하고 있지만, 이미 복잡한 UX 위에 AI를 올리는 것과 처음부터 빠른 UX를 기반으로 만드는 것의 체감은 다르다.

## 초기 세팅: n8n Docker Compose로 띄우기

로컬에서 먼저 검증하고 서버에 올리는 순서로 진행했다. n8n 공식 문서에 Docker Compose 가이드가 잘 정리되어 있어서 기본 세팅은 어렵지 않다. 현재 stable 버전은 2.18.5다.

`docker-compose.yml`:

```yaml
version: "3.8"

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:stable
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - GENERIC_TIMEZONE=Asia/Seoul
      - TZ=Asia/Seoul
      - N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
      - N8N_RUNNERS_ENABLED=true
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - WEBHOOK_URL=https://n8n.yourdomain.com
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

`N8N_ENCRYPTION_KEY`는 `.env` 파일에 따로 관리해야 한다. 이 키로 credential이 암호화된다. 나중에 서버를 이전하거나 백업을 복원할 때 이 키가 없으면 저장한 credential을 복호화할 수 없다. 처음부터 안전하게 보관해야 하고, 절대 Git에 올리면 안 된다.

`WEBHOOK_URL`은 외부에서 접근 가능한 도메인을 넣는다. GitHub이나 Linear가 n8n에 webhook을 보낼 수 있으려면 공개 URL이 필요하다. 로컬 테스트 중이라면 n8n이 제공하는 tunnel 기능을 임시로 쓸 수 있다. Cloudflare Tunnel과 연동하는 방식도 잘 알려져 있다. 프로덕션에서는 별도 도메인과 SSL을 붙여야 한다.

`docker compose up -d`로 올리면 `localhost:5678`에서 n8n UI가 뜬다. 첫 실행 시 계정을 만들면 바로 워크플로우를 만들 수 있다.

Linear API 키는 Settings > API > Personal API Keys에서 발급한다. 이 키를 n8n credential에 등록하면 Linear 노드를 쓸 수 있다. Webhook은 Settings > API > Webhooks에서 설정한다. 이슈 생성, 업데이트, 상태 변경 등 원하는 이벤트를 고르고 n8n의 webhook URL을 등록하면 된다.

## 첫 워크플로우: GitHub PR → Linear 이슈 자동 링크

가장 먼저 만든 건 GitHub PR과 Linear 이슈를 연결하는 워크플로우였다. Linear가 PR 제목 기반으로 자동 연결을 해주지만, 우리는 조금 더 구체적인 동작을 원했다. PR이 열릴 때 PR 본문을 파싱해서 이슈 ID를 찾고, 해당 이슈에 PR 링크와 요약을 코멘트로 자동으로 달아주는 것.

n8n 워크플로우 구조는 다음과 같다.

1. GitHub Trigger (Webhook): PR 이벤트 수신
2. IF 노드: action이 `opened` 또는 `synchronize`인지 확인
3. Code 노드: PR 제목과 본문에서 이슈 ID 추출
4. Linear 노드: 이슈에 코멘트 추가

Code 노드에서 이슈 ID를 추출하는 부분:

```javascript
const body = $input.item.json.body.pull_request.body || '';
const title = $input.item.json.body.pull_request.title || '';
const prUrl = $input.item.json.body.pull_request.html_url;

const issuePattern = /[A-Z]+-\d+/g;
const matches = [...new Set([
  ...(title.match(issuePattern) || []),
  ...(body.match(issuePattern) || []),
])];

return matches.map(issueId => ({
  json: { issueId, prUrl, title }
}));
```

이슈 ID가 여러 개면 여러 아이템으로 쪼개서 Linear 노드가 각각에 코멘트를 달도록 했다. Linear 노드는 n8n에 기본 내장되어 있다. credential에 API 키를 넣고, `Create Comment` 액션에서 이슈 ID와 코멘트 본문을 설정하면 끝이다.

첫 테스트에서 PR을 열었을 때 Linear 이슈에 코멘트가 달리는 걸 확인했을 때, 직접 담당자에게 메시지를 보내거나 이슈를 찾아서 업데이트하는 과정이 사라진다는 게 실감이 났다.

## 막힌 것들

매끄럽게 된 게 하나도 없었다. 이 부분이 이 글에서 가장 솔직한 섹션이다.

**Credential 암호화 키 분실 위기.** 처음 세팅할 때 `N8N_ENCRYPTION_KEY`를 환경변수로 주지 않았다. n8n이 자동으로 키를 생성하는데, 이게 볼륨 안 특정 경로에 저장된다. 테스트하면서 볼륨을 한 번 날렸더니 키가 사라졌다. 볼륨은 다시 만들었지만 이미 등록해둔 credential을 전부 복호화할 수 없게 됐다. GitHub API 키, Linear API 키를 다시 발급하고 n8n에 재등록하는 데 30분을 썼다. 지금은 `.env`에 키를 명시적으로 관리하고, 그 파일을 별도로 백업한다.

**Webhook 중복 트리거.** GitHub repository Settings > Webhooks에서 실수로 같은 URL을 두 번 등록했다. PR을 열 때마다 Linear 이슈에 코멘트가 두 개씩 달렸다. 원인을 찾는 데 생각보다 오래 걸렸다. n8n 실행 로그에는 두 번 실행됐다는 게 보이는데, 처음엔 n8n 내부 문제인 줄 알고 워크플로우를 살펴봤다. GitHub webhook 설정을 확인했을 때 중복 항목이 보였다. 하나 지우고 해결됐다. n8n 워크플로우에도 중복 방어 로직을 추가했다. PR URL을 키로 해서 이미 처리한 PR이면 skip하는 IF 노드다.

**Linear API rate limit.** 이슈 ID가 많이 포함된 PR을 열었을 때 한 번에 여러 코멘트 요청을 보내면 429가 났다. n8n에 Wait 노드가 있다. Linear 노드 앞에 1초 대기를 넣었더니 해결됐다. 간단한 수정이었지만, 처음엔 에러 메시지가 구체적이지 않아서 원인을 파악하는 데 시간이 걸렸다. n8n 실행 로그에서 HTTP 응답 코드를 직접 확인하는 습관을 들인 뒤로 디버깅이 빨라졌다.

## 지금 상태와 다음 편

지금은 두 가지 워크플로우가 안정적으로 돌고 있다. GitHub PR 열릴 때 Linear 이슈에 자동 코멘트, Linear 이슈 상태가 Done으로 바뀔 때 Slack 채널에 알림. 소소하지만 매일 하던 수동 작업이 줄었다. 팀원이 Linear 이슈 상태를 직접 Slack에 공유하던 습관이 사라졌다.

다음 편에서는 좀 더 복잡한 것을 다룬다. Git 커밋 히스토리와 코드 변경 내용을 임베딩으로 저장하고, 새 Linear 이슈가 생성될 때 기존 코드베이스와 충돌 가능성이 있는지 자동으로 감지하는 파이프라인이다. "이 이슈, 이미 비슷한 게 구현돼 있는 것 같은데?"를 자동으로 잡아내는 것. n8n Code 노드에서 임베딩 API를 직접 호출하고, 유사도를 계산해서 Linear 이슈에 경고 코멘트를 다는 흐름이 핵심이 될 것 같다.

## 참고 자료

- [n8n Docker Installation](https://docs.n8n.io/hosting/installation/docker/): 공식 Docker 설치 가이드, 현재 stable 버전 2.18.5
- [Linear Developer Docs](https://developers.linear.app/docs): Linear GraphQL API 및 webhook 설정 레퍼런스
- [n8n-hosting GitHub](https://github.com/n8n-io/n8n-hosting): 공식 Docker Compose 예제 모음 (PostgreSQL 연동 포함)
