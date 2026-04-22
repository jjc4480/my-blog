---
title: 'RAG와 벡터 검색, 그리고 pgvector'
date: 2026-04-18
description: 'RAG가 뭔지부터 짚어보고, 필요한 벡터 검색을 어디서 돌리는지, 최근에 PostgreSQL + pgvector 쪽으로 모이는 흐름과 실제 SQL 예제까지 정리.'
tags: [postgres, pgvector, ai, rag, database, architecture]
slug: just-use-postgres
category: engineering
published: true
---

요즘 LLM 관련 기능을 서비스에 붙여보려고 자료를 뒤적이다 보면 금방 마주치는 단어가 있다. RAG. 정확히 뭘 가리키는 말이고, 왜 필요하고, 붙이려면 뭐가 들어가는지, 이참에 정리해봤다.

결론부터 말하면, RAG를 돌리려면 "의미 기반 검색"이라는 게 중간에 들어가야 하고, 이걸 위한 저장소로 한동안 전용 벡터 DB를 따로 두는 게 표준이었다. 그런데 요즘은 PostgreSQL에 `pgvector` 확장 하나 붙여서 같은 DB 안에서 해결하는 흐름이 늘었다. 전용 벡터 DB는 써본 적이 없어서, 이 글은 pgvector 쪽을 중심으로 "무엇을, 어떻게 쓰는지" 정리하는 데 가깝다.

## RAG가 뭔가

LLM(대형 언어 모델)은 훈련 데이터 바깥의 얘기를 물으면 그럴듯한 거짓말을 지어내거나(hallucination) 모른다고 답한다. 사내 문서, 제품 매뉴얼, 최신 뉴스 같은 건 학습에 들어가 있지 않으니까.

RAG(Retrieval-Augmented Generation, 검색 증강 생성)는 이걸 피하려고 나온 패턴이다. 질문이 들어오면 먼저 관련 문서를 찾아와서(retrieval) 프롬프트에 같이 붙여 LLM한테 답하게(generation) 한다. 모델을 다시 훈련시킬 필요 없이 "참고 자료 가져와서 보고 답해"라고 시키는 구조다. 최신 데이터를 반영하기 쉽고, 근거 문서를 같이 보여줄 수 있어서 사내 챗봇이나 문서 검색 서비스에 많이 쓰인다.

이때 "관련 문서를 찾는" 부분이 난이도가 있다. 키워드 일치만으로는 "프린터 설정"과 "출력 장치 구성"이 같은 뜻이란 걸 못 잡는다. 그래서 텍스트를 숫자 배열(벡터 임베딩)로 바꿔놓고, 질문 벡터와 가까운 문서 벡터를 찾는 방식을 쓴다. 의미 기반 검색이라고 부르는 이유다.

## 벡터 검색은 어디서 돌리는가

이 "벡터 거리 기반 검색"을 빠르게 돌리려면 특수한 인덱스 구조가 필요하다. HNSW(근사 최근접 이웃을 그래프로 탐색하는 인덱스)나 IVFFlat 같은 근사 알고리즘이 대표적이다. 벡터 하나당 수백~수천 차원인 데이터를 수백만 건 뒤져야 하니, 일반적인 B-tree 인덱스로는 못 푼다.

자료들을 보면 한동안 이 목적을 위해 전용 벡터 DB를 따로 두는 구조가 기본처럼 다뤄졌다. Pinecone, Weaviate, Qdrant, Milvus 같은 이름들. 관계형 데이터는 PostgreSQL, 캐시는 Redis, 검색은 Elasticsearch, 벡터는 또 별도. 구조가 화려한 대신 운영해야 할 컴포넌트가 늘어난다.

그런데 최근 자료는 조금 다른 방향을 가리킨다. PostgreSQL에 `pgvector`라는 확장을 붙이면 같은 기능을 같은 DB 안에서 처리할 수 있다는 얘기다. 전용 엔진의 최상단 성능을 완전히 따라잡았다는 건 아니지만, 웬만한 규모라면 충분히 쓸 만하다는 분위기로 옮겨가는 중이다.

## pgvector가 뭐고 왜 쓸 만해졌나

pgvector는 PostgreSQL에 벡터 타입과 유사도 연산을 추가하는 확장(extension)이다. 설치하면 `vector` 타입과 L2/코사인/내적 같은 거리 연산자, 그리고 HNSW와 IVFFlat 인덱스를 쓸 수 있다.

초기엔 "작은 데이터엔 괜찮은데 프로덕션엔 좀..." 평가가 많았다고 한다. 최근 몇 개 버전에 걸쳐 아래 같은 개선이 들어오면서 분위기가 바뀌었다.

- HNSW 인덱스 빌드를 병렬로 돌릴 수 있게 됨 (`max_parallel_maintenance_workers` 튜닝)
- halfvec, binary, sparse 벡터 타입 추가로 인덱스 크기/메모리 부담 감소
- 필터 조건이 섞인 쿼리를 위한 반복 스캔(iterative index scan) 지원
- 외부 확장인 [pgvectorscale](https://github.com/timescale/pgvectorscale)을 얹으면 디스크 기반 인덱스(StreamingDiskANN)까지 사용 가능

"벡터 검색 성능 때문에 Postgres를 피할" 이유가 꽤 줄었다는 얘기다.

## 단일 Postgres의 장점

직접 두 스택을 비교 운영해본 건 아니고, 자료 정리와 pgvector를 만져본 결과를 방향성 위주로 정리했다.

| 항목 | 전용 스택 (벡터 DB + Redis + ES) | PostgreSQL 단일 |
|---|---|---|
| 운영 포인트 | 여러 개 (각각 모니터링/백업/버전 관리) | 하나 |
| 관계형 + 벡터 조합 쿼리 | 앱에서 두 번 쿼리 후 수동 조합 | 단일 SQL로 JOIN |
| 트랜잭션 일관성 | 서비스 간 수동 보정 필요 | ACID로 자동 |
| 데이터 이동 | 네트워크 홉 여러 번 | 같은 DB 내부 |
| 비용 | 벡터 DB 구독료 + 캐시/검색 인프라 | Postgres 인스턴스 한 대 |
| 지연(latency) | 네트워크/직렬화 오버헤드 누적 | DB 내부에서 처리, 한 홉 |

구조상 가장 크게 드러나는 차이는 "관계형 데이터와 벡터를 한 쿼리에 섞는 순간"이다. "이 유저가 쓴 글 중에서 이 벡터와 가까운 것 20개"처럼 조건이 붙으면, 벡터 DB를 별도로 두는 스택에선 쿼리를 두 번 쏘고 앱에서 합쳐야 한다. Postgres에선 JOIN 하나로 끝난다.

인프라 단순함도 크다. "장애 났을 때 어디부터 봐야 하지" 하는 순간이 줄어드는 게, 월 고정비 몇십만 원 줄어드는 것보다 체감상 더 큰 편이다.

## 실제 SQL 예제

### 확장 설치와 벡터 컬럼

```sql
CREATE EXTENSION vector;

CREATE TABLE documents (
  id           SERIAL PRIMARY KEY,
  author_id    INT NOT NULL,
  title        TEXT,
  body         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  embedding    vector(1536)
);
```

차원은 사용하는 임베딩 모델에 맞춘다. OpenAI `text-embedding-3-small`이면 1536, `text-embedding-3-large`는 3072. 모델을 바꾸면 차원 맞춰 마이그레이션 해야 하니까 초기에 한 번 정해두는 게 편하다.

단, `vector` 타입의 HNSW 인덱스는 최대 2,000차원까지 지원한다. 3072차원 모델(`text-embedding-3-large`)을 쓰면서 HNSW 인덱스를 걸려면 `halfvec` 타입을 써야 한다.

```sql
-- 3072차원 모델 사용 시
embedding  halfvec(3072)

-- 인덱스도 halfvec_cosine_ops 사용
CREATE INDEX ON documents
USING hnsw (embedding halfvec_cosine_ops);
```

### HNSW 인덱스

```sql
CREATE INDEX ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

`m`은 각 노드의 최대 연결 수, `ef_construction`은 그래프를 만들 때 탐색 후보 크기다. 둘 다 크게 잡으면 정확도(recall)가 올라가고 빌드 시간/메모리가 늘어난다. 기본값으로 시작하고, 리콜 수치 확인하면서 조절하면 된다.

빌드 시간이 길다면:

```sql
SET maintenance_work_mem = '8GB';
SET max_parallel_maintenance_workers = 7;
```

그래프가 `maintenance_work_mem`에 다 들어가면 빌드가 눈에 띄게 빨라진다. 병렬 워커도 늘리면 더 짧아진다. 다만 서버 전체 메모리를 깨먹지 않게 주의.

### 유사도 검색

```sql
SELECT id, title, 1 - (embedding <=> $1) AS similarity
FROM documents
ORDER BY embedding <=> $1
LIMIT 10;
```

`<=>`는 코사인 거리다. "유사도"로 쓰려고 `1 - 거리`로 뒤집었다. 거리 함수 종류는 여러 개(`<->` L2, `<#>` 내적, `<+>` L1 등)고, 인덱스를 만들 때 지정한 함수를 써야 인덱스가 탄다.

### 관계형 + 벡터 조합 쿼리

이게 단일 DB의 진짜 강점이다.

```sql
SELECT d.id, d.title, d.created_at, u.username
FROM documents d
JOIN users u ON u.id = d.author_id
WHERE u.role = 'verified'
  AND d.created_at > NOW() - INTERVAL '30 days'
ORDER BY d.embedding <=> $1
LIMIT 20;
```

"인증된 유저가 최근 30일간 쓴 글 중에 이 쿼리 벡터와 가까운 20개." 앱 레벨에서 조건 필터링과 벡터 검색을 따로 돌리는 구조라면 왕복과 수동 조합이 필요하다. 여기선 한 번의 SQL로 끝난다.

다만 필터 비율이 낮으면(전체 중 맞는 행이 몇 퍼센트 안 되면) HNSW 인덱스가 먼저 훑은 결과에서 남는 게 너무 적을 수 있다. 이 경우 `hnsw.ef_search`를 키우거나, pgvector 0.8 이후에 들어온 반복 스캔을 켜면 된다.

```sql
SET hnsw.ef_search = 200;
-- 또는
SET hnsw.iterative_scan = strict_order;
```

### 대용량에는 pgvectorscale의 StreamingDiskANN

수백만~수천만 벡터 규모에서 메모리가 빠듯해지면 pgvector 코어 HNSW 대신 [pgvectorscale](https://github.com/timescale/pgvectorscale)의 `diskann` 인덱스를 쓸 수 있다. 이름 그대로 디스크 기반이라 RAM 부담이 덜하다.

```sql
CREATE EXTENSION vectorscale CASCADE;

CREATE INDEX ON documents
USING diskann (embedding vector_cosine_ops);
```

단일 Postgres로 커버 가능한 스케일을 꽤 넓혀준다. 모든 상황에서 만능은 아니니, 먼저 HNSW로 시작하고 한계에 닿으면 그때 고려하는 순서가 맞다.

## 이미 전용 벡터 DB를 쓰고 있다면

(여기부터는 직접 경험한 얘기는 아니고, 공식 가이드와 여러 사례에서 반복적으로 나오는 흐름을 정리한 것이다.)

기존 전용 벡터 DB에서 pgvector로 옮긴다면 큰 그림은 대략 이렇다고 한다.

1. 기존 Postgres에 `vector` 확장 설치
2. 기존 벡터 DB에서 벡터를 export (보통 JSON 또는 numpy 덤프)
3. `documents` 테이블에 `COPY`로 대량 적재. 한 줄씩 INSERT하지 말 것
4. 데이터가 다 들어온 뒤 HNSW 인덱스 생성
5. 애플리케이션의 쿼리 레이어 교체 (기존 SDK 호출을 `pg` 쿼리로)
6. 로그/모니터링을 Postgres 쪽으로 일원화

여러 사례에서 공통으로 짚는 주의점은 이 정도.

- **인덱스는 데이터 적재 이후에 만든다.** 적재 전에 만들면 INSERT마다 인덱스 갱신 비용이 붙는다.
- **`maintenance_work_mem`을 넉넉히 잡는다.** 그래프가 메모리에 다 들어가면 빌드 속도가 크게 차이 난다.
- **`ef_search`는 런타임 튜닝 포인트다.** 너무 낮으면 리콜이 떨어지고, 너무 높으면 쿼리가 느려진다. 실제 쿼리로 측정하면서 조절.
- **모델 차원 맞추기.** 기존 임베딩을 그대로 옮길 거면 차원만 맞으면 되지만, 모델 자체를 바꿀 거면 다시 임베딩해야 한다.

## 전용 벡터 DB가 맞는 경우

Postgres가 모든 상황에 맞는 건 아니다. 자료를 보다 보면 아래 같은 상황에선 전용 엔진 쪽이 맞다는 얘기가 반복된다.

- **수십억~수백억 벡터 규모.** 단일 Postgres 인스턴스로 감당하기 힘든 스케일이면 분산 아키텍처가 기본인 전용 엔진이 편하다.
- **벡터 검색이 서비스의 전부인 경우.** 관계형 데이터가 거의 없고 검색 품질/성능이 핵심 지표라면, 그 목적으로 설계된 엔진이 유리하다.
- **이미 팀이 특정 벡터 DB에 깊게 투자해둔 경우.** 전환 비용이 크면 굳이 당장 갈아엎을 이유가 없다.
- **특수한 기능이 필요한 경우.** 멀티모달 하이브리드 검색, 특정 랭킹 알고리즘 내장, 전용 ANN 튜닝 파라미터 등 도메인에 맞춘 기능이 꼭 필요하면 전용 엔진의 강점이 살아난다.

반대로 위 조건에 안 걸리면 대부분 Postgres로 충분하다는 결론이다. 운영 포인트가 하나 줄고, 관계형 조건과 벡터 검색을 한 트랜잭션으로 묶을 수 있고, 백업/복구는 기존 Postgres 체계 그대로. 새로 도구를 배울 필요도 없다.

처음 RAG를 붙여보려는 입장에서도 이게 크다. 새 서비스 하나를 더 떠안지 않고, 이미 익숙한 DB 안에서 시작할 수 있다는 점. 많은 글이 "일단 pgvector로 시작해보라"고 권하는 맥락이 여기에 있다.

## 참고 자료

- [pgvector GitHub](https://github.com/pgvector/pgvector): 공식 레포지토리, 인덱스/쿼리 옵션 전체
- [pgvectorscale](https://github.com/timescale/pgvectorscale): StreamingDiskANN 포함 대규모 벡터 검색용 확장
- [PostgreSQL Documentation: CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html): 인덱스 빌드 튜닝 파라미터 공식 문서
- [pgvector: Iterative Index Scans](https://github.com/pgvector/pgvector#iterative-index-scans): 필터 + 벡터 검색 조합의 리콜 개선 방법
