---
title: "[시리즈 2] git 코드 임베딩 + Linear 이슈 충돌 감지 — n8n으로 연결하기"
date: "2026-04-30"
published: false
category: "트렌드"
tags: ["n8n", "linear", "embeddings", "vector-search", "pgvector", "automation"]
description: "새 Linear 이슈가 올라올 때마다 기존 코드베이스와 의미적으로 충돌하는 부분이 없는지 자동으로 감지하는 파이프라인을 n8n으로 연결한 과정. 잘 된 것과 안 된 것을 같이 기록한다."
---
[지난 편](/blog/2026-04-30-n8n-linear-series-1)에서 n8n과 Linear를 붙이는 기본 파이프라인을 만들었다. GitHub PR이 열리면 Linear 이슈에 자동으로 코멘트가 달리는 것. 이번엔 반대 방향이다. Linear에 이슈가 생성될 때, 기존 코드베이스와 충돌 가능성이 있는지 자동으로 판단하는 파이프라인을 만들었다.

## 왜 이걸 만들었나

팀 규모가 작으면 코드베이스를 머릿속에 꽤 많이 담고 있다. 누군가 이슈를 올리면 "아, 그거 미들웨어 쪽에 이미 비슷한 로직이 있는데"라고 금방 말할 수 있다. 팀이 커지거나 코드베이스가 복잡해지면 그게 안 된다. 놓치기 시작한다.

구체적으로 겪은 상황이 있다. API 인증 정책을 변경하는 이슈가 올라왔는데, 기존 미들웨어 레이어에서 같은 로직을 이미 처리하고 있었다. 이슈 담당자도 몰랐고, 리뷰어도 PR 단계에서야 발견했다. 그 시점에는 이미 구현이 절반 이상 진행된 뒤였다.

자동화 목표는 단순했다. 새 이슈가 생성되는 순간, 이슈 텍스트와 의미적으로 가까운 코드 청크를 찾아내고, 충돌 가능성이 있으면 이슈에 바로 코멘트를 다는 것. 빠르면 빠를수록 좋다. 구현 시작 전에 잡는 게 PR 리뷰에서 잡는 것보다 훨씬 저렴하다.

이 아이디어 자체는 새로운 게 아니다. 많은 팀이 코드 검색 도구를 쓴다. 새로운 부분은 그걸 이슈 트래커와 연결해서, 개발자가 별도로 검색하지 않아도 이슈 생성 시점에 자동으로 알림이 오게 만드는 것이다. 마찰을 줄이는 것이 핵심이었다.

## 전체 파이프라인 구조

두 개의 파이프라인이 있다. 코드를 임베딩해서 저장하는 것과, 이슈 생성 시 검색하는 것.

```
[git repo]
  → n8n Execute Command (git clone)
  → Code 노드: 파일 순회 + 청킹
  → HTTP Request: OpenAI embedding API
  → Code 노드: pgvector INSERT
  ↑ PR merge 시 변경 파일만 재실행

[Linear issueCreate webhook]
  → n8n Webhook 트리거
  → HTTP Request: 이슈 텍스트 embedding
  → Code 노드: pgvector cosine similarity 검색
  → HTTP Request: LLM 충돌 판단
  → Linear 노드: 이슈에 코멘트
```

pgvector는 기존에 PostgreSQL을 쓰고 있어서 확장만 설치했다. 별도 벡터 DB를 운영하지 않아도 된다는 점이 실용적이었다.

## 1단계: 코드 임베딩 파이프라인

### git clone과 파일 순회

n8n Execute Command 노드로 레포를 클론한다. `--depth=1`로 최신 커밋만 받는다.

n8n Code 노드에서 파일을 순회하고 텍스트를 추출한다. 이미지, 바이너리, `node_modules`, `.git` 디렉토리는 건너뛴다.

```javascript
const fs = require('fs');
const path = require('path');

const repoPath = '/tmp/repo';
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '__pycache__']);
const CODE_EXTS = new Set(['.js', '.ts', '.py', '.go', '.java', '.rs', '.md']);

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (CODE_EXTS.has(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(repoPath);
return files.map(f => ({
  json: {
    file_path: f.replace(repoPath + '/', ''),
    content: fs.readFileSync(f, 'utf8').slice(0, 8000), // 토큰 한도 고려
  }
}));
```

### 청킹 전략

파일 단위 vs 함수 단위를 고민했다. 함수 단위가 더 정밀하지만, AST 파싱이 언어마다 달라서 구현 비용이 높다. 처음엔 파일 단위로 시작했다. 파일이 너무 길면 8000자에서 잘랐다. 나중에 단점이 드러났는데, 큰 파일에서는 관련 없는 코드가 같은 청크에 섞여서 precision이 떨어졌다. 현재는 파일을 200줄 단위로 슬라이딩 윈도우 방식으로 쪼개고 있다. 50줄씩 겹치게 해서 청크 경계에서 문맥이 잘리는 걸 완화했다. 완벽하진 않지만 파일 단위보다 낫다. 함수 단위 청킹은 tree-sitter 같은 파서를 붙이면 가능하다. 언어가 하나라면 시도해볼 만하다. 우리 레포는 TypeScript, Go, Python이 섞여 있어서 일단 보류했다.

### OpenAI embedding 호출

n8n HTTP Request 노드를 쓴다. `text-embedding-3-small` 모델을 선택했다. `text-embedding-3-large`보다 비용이 5배 싸고, 코드 유사도 검색 정도의 작업에서는 품질 차이가 크지 않았다.

```
POST https://api.openai.com/v1/embeddings
{
  "model": "text-embedding-3-small",
  "input": "{{ $json.content }}"
}
```

파일 수가 많으면 API 호출이 많아진다. n8n에서 Rate Limit 방지용으로 각 HTTP Request 노드 앞에 Wait 노드를 넣고 100ms 대기를 줬다. Batch 크기는 20개로 제한했다.

### pgvector 저장

```sql
CREATE TABLE code_chunks (
  id SERIAL PRIMARY KEY,
  repo TEXT NOT NULL,
  file_path TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1536),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON code_chunks
  USING hnsw (embedding vector_cosine_ops);
```

n8n Code 노드에서 `pg` 모듈을 require해서 INSERT한다. PR merge 시 변경된 파일 경로를 `git diff --name-only`로 뽑아서 해당 파일만 재임베딩한다. 전체를 다시 돌리는 건 비효율적이다.

## 2단계: Linear webhook → 충돌 감지

### Linear issueCreate 트리거

Linear Settings > API > Webhooks에서 `issueCreate` 이벤트를 n8n webhook URL에 등록한다. 이슈가 생성되면 제목과 설명이 payload로 온다.

### pgvector 유사도 검색

이슈 텍스트를 임베딩하고 가장 가까운 코드 청크를 찾는다.

```sql
SELECT
  file_path,
  chunk_text,
  1 - (embedding <=> $1::vector) AS similarity
FROM code_chunks
WHERE repo = $2
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

`<=>` 연산자가 cosine distance다. `1 - distance`가 similarity다. threshold는 0.78로 시작해서 false positive를 보면서 조정했다. 처음에 0.70으로 잡았더니 너무 많이 걸렸다.

### LLM 충돌 판단

top-5 청크를 가져와서 LLM에 넘긴다. 직접 판단하게 하지 않고, 충돌 가능성 있는 것만 필터링하게 했다.

```
당신은 코드베이스 분석 도우미입니다.
아래는 새로 생성된 이슈와 코드베이스에서 의미적으로 유사한 코드 조각들입니다.
이슈가 기존 코드와 충돌하거나 중복될 가능성이 있는지 판단하세요.

[새 이슈]
제목: {{ issueTitle }}
설명: {{ issueDescription }}

[관련 코드]
{{ top5Chunks }}

판단 기준:
- 이슈가 이미 구현된 기능을 재구현하려 한다면 "중복" 가능성 있음
- 이슈의 정책이 기존 코드의 동작과 직접 모순된다면 "충돌" 가능성 있음
- 단순히 비슷한 주제라면 충돌이 아님

응답 형식(JSON):
{"conflict": true|false, "reason": "한 줄 설명", "files": ["관련 파일 경로"]}
```

LLM 응답이 JSON이면 파싱해서 `conflict: true`일 때만 Linear에 코멘트를 단다. false인 경우는 조용히 넘긴다. 노이즈가 많으면 팀이 무시하게 된다. 이 부분이 가장 중요하다. 자동화 알림은 팀이 신뢰할 수 있을 때만 가치가 있다. 맞는 것보다 틀린 것이 많으면 무시당하고, 결국 꺼진다.

## 잡아낸 것들과 잡지 못한 것들

실제로 효과가 있었던 케이스가 있다. 외부 OAuth 콜백 URL 정책을 바꾸는 이슈가 올라왔을 때, 기존 인증 미들웨어 파일이 top-3에 들어왔고 LLM이 충돌 가능성을 감지했다. 담당자가 확인하니 실제로 같은 설정을 두 곳에서 다르게 다루고 있었다. 이슈 시작 단계에서 잡은 거라 수정 비용이 낮았다.

잘 안 된 케이스도 있다. "로그인 세션 만료 처리"라는 이슈를 넣었을 때 세션 관련 코드가 죄다 걸렸다. 5개 청크를 LLM에 넘겼는데 LLM이 "충돌 가능성 있음"을 반환했지만 실제로는 새 기능 추가였고 기존 코드를 건드릴 필요가 없었다. false positive였다. 이슈 설명이 구체적일수록 precision이 올라간다. 제목만 한 줄인 이슈는 여전히 잘 못 잡는다.

현재 precision은 잡힌 케이스 중 실제 충돌 비율로 따지면 60% 정도다. 낮게 느껴질 수 있지만, 자동 코멘트가 달리면 담당자가 한 번 더 확인하게 된다는 것 자체로 의미가 있다. 완전히 자동화하는 게 아니라 사람의 판단을 보조하는 것이 목적이라서 이 정도면 쓸 만하다. 도입 전 한 달과 비교했을 때, 이슈 논의 단계에서 코드 중복이 발견된 케이스가 3배 늘었다. PR에서 발견되는 건 그만큼 줄었다.

## 막힌 것들

**Execute Command 노드의 PATH 문제.** n8n 컨테이너 안에서 `git`을 실행하려면 `git`이 설치되어 있어야 한다. 공식 이미지에는 기본으로 없다. Dockerfile을 커스터마이징해서 `git`을 설치했다. 또, Execute Command 노드가 실행되는 환경의 `PATH`가 일반 쉘과 달라서 절대 경로(`/usr/bin/git`)로 명시해야 했다.

**초기 임베딩 시간.** 처음 전체 레포를 임베딩할 때 약 1,200개 파일, 파일당 평균 1.5개 청크로 1,800개 API 호출이 나왔다. Rate limit을 고려해서 100ms 간격으로 호출하면 총 3분 정도 걸렸다. 기다릴 수 있는 시간이지만, 레포가 더 크다면 배치 API를 고려해야 한다. OpenAI Batch API를 쓰면 비용도 절반이고 속도 제한도 완화된다. 아직 전환하진 않았다.

**pgvector 인덱스 선택.** `ivfflat`과 `hnsw` 중 `hnsw`를 선택했다. `ivfflat`은 인덱스 빌드가 빠르지만 recall이 낮고, `hnsw`는 빌드가 느리지만 recall이 높다. 청크가 2,000개 이하인 지금은 둘의 차이가 크지 않지만, 확장을 고려해서 `hnsw`로 시작했다. 인덱스 파라미터(`m`, `ef_construction`)는 기본값으로 두고 있다.

## 지금 상태와 비용

매일 평균 15개 이슈가 생성되고, 건당 OpenAI API 호출이 두 번(이슈 임베딩 + LLM 판단)이다. 월 비용은 임베딩 $2 미만, LLM 판단 $5 내외다. 인프라 비용은 기존 PostgreSQL에 pgvector 확장만 추가한 것이라 추가 비용이 없다.

다음으로 개선하고 싶은 건 두 가지다. 이슈 설명이 짧을 때 LLM에게 이슈를 먼저 보강하게 하고 그 텍스트로 검색하는 것, 그리고 false positive를 사람이 피드백할 수 있는 인터페이스를 Linear 코멘트에 추가하는 것. 피드백이 쌓이면 threshold 조정에 데이터로 쓸 수 있다.

이 파이프라인 전체를 만드는 데 실제로 걸린 시간은 이틀 정도다. 복잡해 보이지만 각 단계가 명확하게 분리되어 있다. n8n 덕분에 각 단계를 독립적으로 테스트하고 연결하기 쉬웠다. 코드로만 짰다면 인프라 연결 부분에서 더 시간이 걸렸을 것이다. 완벽하지 않지만, 이 정도면 충분히 팀에 가치를 준다.

## 참고 자료

- [pgvector GitHub](https://github.com/pgvector/pgvector): PostgreSQL 벡터 확장, hnsw/ivfflat 인덱스 파라미터 설명 포함
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings): text-embedding-3-small 모델 스펙 및 비용
- [n8n Execute Command 노드](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executecommand/): 컨테이너 환경에서 쉘 명령 실행 시 주의사항
