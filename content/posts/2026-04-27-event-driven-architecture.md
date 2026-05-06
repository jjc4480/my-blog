---
title: "이벤트 기반 아키텍처 입문: Kafka 없이 시작하는 메시지 큐 실전 패턴"
date: "2026-04-27"
published: true
category: "backend"
tags: ["event-driven", "microservices", "redis", "nats", "bullmq", "messaging", "architecture"]
description: "마이크로서비스 간 결합을 끊는 가장 현실적인 방법. Redis Streams, NATS JetStream, BullMQ 실전 가이드."
---

주문 서비스가 결제를 처리하고, 완료되면 알림·재고·포인트 서비스에 각각 HTTP 요청을 보낸다.

이 구조는 직관적이다. 그리고 지뢰밭이다. 알림 서비스가 5초 지연이면 주문 서비스도 블록된다.

이벤트 기반 아키텍처는 이 문제를 잘라낸다. 주문 서비스는 "주문 완료" 이벤트를 발행하고 끝낸다.

## 핵심 개념 정리

**이벤트 vs 커맨드**: 커맨드는 "이것을 해라", 이벤트는 "이런 일이 일어났다". 발행자는 구독자를 모른다.

**Pub/Sub**: 하나의 메시지를 여러 구독자가 수신. **Queue**: 하나의 메시지를 하나의 워커만 처리.

**At-least-once vs Exactly-once**: 현실적 선택은 At-least-once + 멱등 처리(이벤트 ID 기반 중복 스킵).

## BullMQ: Node.js에서 가장 빠른 출발점

Redis 위에서 동작. 기존 Redis가 있다면 별도 인프라 없이 바로 시작 가능.

```typescript
import { Queue, Worker } from 'bullmq';
const emailQueue = new Queue('email', { connection });

await emailQueue.add('send-welcome', { to: 'user@example.com' }, {
  attempts: 3, backoff: { type: 'exponential', delay: 1000 }, delay: 5000
});

const worker = new Worker('email', async (job) => {
  await sendEmail(job.data);
}, { connection, concurrency: 5 });
```

설치: `npm install bullmq ioredis`

**한계**: Redis 단일 노드 의존. 이벤트 리플레이나 서비스 간 팬아웃은 복잡해진다.

## Redis Streams: 이미 Redis가 있다면

```typescript
await redis.xadd('orders', '*', 'event', 'order.completed', 'orderId', 'ord-456');
await redis.xgroup('CREATE', 'orders', 'notification-service', '$', 'MKSTREAM');
```

Consumer Group으로 분산 처리. ACK 없이 실패한 메시지는 `XPENDING`으로 추적.

**장점**: 별도 인프라 없음. **한계**: 추상화 없어 보일러플레이트 많음. 대규모 트래픽에서 메모리 한계.

## NATS JetStream: 경량 고성능 메시징

단일 바이너리 15MB, 설정 파일 몇 줄로 시작. 지연시간 수십 마이크로초, 초당 수백만 메시지.

Kafka가 필요한 ZooKeeper, 브로커 클러스터, 파티션 관리 없이 클러스터 구성 가능.

```typescript
const nc = await connect({ servers: 'nats://localhost:4222' });
const js = nc.jetstream();

await js.publish('orders.completed', sc.encode(JSON.stringify({ orderId: 'ord-789' })));

const sub = await js.subscribe('orders.completed', { durable: 'worker', ack_policy: 'explicit' });
for await (const msg of sub) { await processOrder(msg); msg.ack(); }
```

## Kafka는 언제 필요한가

| 상황 | Kafka 필요 여부 |
|------|----------------|
| 초당 수십만 메시지 이상 | 필요 |
| 장기 이벤트 리플레이 | 필요 |
| 수십 개 Consumer Group | 필요 |
| 하루 수백만 이하 메시지 | 불필요 |
| 단일 팀 마이크로서비스 | 불필요 |

스타트업에서 Kafka를 너무 일찍 도입하면 운영 비용이 개발 비용을 초과한다. BullMQ나 NATS로 시작하고 한계에 부딪혔을 때 검토해도 늦지 않다.

## Outbox Pattern: DB와 이벤트 발행의 원자성

DB 커밋 후 이벤트 발행 사이에 장애가 나면 이벤트가 사라진다.

```typescript
await db.transaction(async (trx) => {
  const [order] = await trx('orders').insert(orderData).returning('*');
  await trx('outbox').insert({ event_type: 'order.completed', payload: JSON.stringify(order), published: false });
});

async function publishOutboxEvents() {
  const events = await db('outbox').where({ published: false }).limit(100);
  for (const e of events) {
    await queue.add(e.event_type, JSON.parse(e.payload));
    await db('outbox').where({ id: e.id }).update({ published: true });
  }
}
setInterval(publishOutboxEvents, 1000);
```

## 도구 선택 가이드

| 기준 | BullMQ | Redis Streams | NATS JetStream | Kafka |
|------|--------|---------------|----------------|-------|
| 설치 복잡도 | 낮음 | 낮음 | 낮음 | 높음 |
| 이벤트 리플레이 | 불가 | 제한적 | 가능 | 가능 |
| 운영 부담 | 낮음 | 낮음 | 낮음 | 높음 |

**결정 흐름**: Node.js 작업 큐 → BullMQ. 서비스 간 이벤트 전파 → NATS JetStream. 수십만/초, 장기 리플레이 → Kafka.
