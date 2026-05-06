---
title: "JavaScript 불변성: const, Object.freeze, structuredClone, Immer"
description: "const와 불변성은 다르다. Object.freeze, structuredClone, Immer의 차이와 선택 기준, 그리고 성능 걱정 없이 쓰는 구조적 공유 패턴을 실전 코드로 정리한다."
date: "2026-04-30"
tags: ["javascript", "immutability", "immer", "state-management", "performance"]
category: "언어"
published: false
---

불변성(immutability)은 "데이터를 변경하지 않는다"는 원칙이다. 들으면 당연해 보이는데, 실제로 지키기가 까다롭다. 특히 JavaScript는 객체와 배열이 기본적으로 mutable이라서, 의도치 않은 변경이 조용히 버그를 만든다.

이 글에서는 불변성과 관련된 핵심 도구들을 순서대로 짚는다. `const`가 왜 불변이 아닌지부터 시작해서, `Object.freeze`, `structuredClone`, Immer까지. 각 도구가 어떤 문제를 해결하고 어디서 한계에 부딪히는지 코드로 확인한다.

## const는 불변이 아니다

JS를 처음 배울 때 `const`는 "변경 불가"로 소개되는 경우가 많다. 그런데 이게 정확하지 않다.

```javascript
const user = { name: 'Alice', age: 30 };
user.age = 31; // 오류 없음
console.log(user.age); // 31
```

`user`는 `const`로 선언됐는데 `age`가 바뀌었다. 오류도 없다.

`const`가 막는 것은 변수 바인딩 재할당이다. `user = { name: 'Bob' }`처럼 변수 자체에 다른 값을 할당하는 것은 막는다. 하지만 `user.age = 31`은 변수를 바꾸는 게 아니라 변수가 가리키는 객체 안의 속성을 바꾸는 것이다. `const`는 이것까지 막지 않는다.

`const`는 변수 재할당을 막지만, 변수가 참조하는 객체의 속성 변경은 막지 않는다.

이 차이를 모르면 `const`로 선언했으니 안전하다고 착각하고, 함수에 객체를 넘겼을 때 내부에서 속성이 바뀌어도 알아채지 못한다.

```javascript
function process(user) {
  user.role = 'admin'; // 원본 객체를 직접 수정
}

const currentUser = { name: 'Alice', role: 'user' };
process(currentUser);
console.log(currentUser.role); // 'admin' — 의도하지 않은 변경
```

이런 버그는 함수가 멀리 있거나 코드가 복잡할수록 추적하기 어렵다. 불변성의 핵심은 여기 있다. "데이터를 바꿀 때는 기존 것을 수정하지 말고, 새로운 것을 만들어라." 그러면 원본이 언제 바뀌었는지 추적할 필요가 없어진다.

## Object.freeze(): 얕은 동결의 한계

진짜로 객체 변경을 막으려면 `Object.freeze()`를 쓴다.

```javascript
const config = Object.freeze({ host: 'localhost', port: 3000 });
config.port = 8080; // 조용히 실패 (strict mode에서는 TypeError)
console.log(config.port); // 3000
```

`freeze`된 객체에 속성을 바꾸려 하면 일반 모드에서는 조용히 무시되고, `'use strict'`나 ES 모듈 환경에서는 `TypeError`가 발생한다. 어느 쪽이든 수정은 적용되지 않는다.

설정 객체나 상수 집합처럼 변경되면 안 되는 값을 표현할 때 유용하다.

그런데 `freeze`에는 핵심적인 제한이 있다. 동결이 얕다(shallow)는 것이다. 최상위 속성만 잠기고, 중첩 객체는 잠기지 않는다.

```javascript
const state = Object.freeze({
  user: { name: 'Alice', role: 'admin' }, // 이 객체는 동결되지 않음
  count: 0,
});

state.count = 1;          // 실패: 동결됨
state.user.role = 'user'; // 성공: 중첩 객체는 여전히 mutable
```

`state.user`라는 속성 자체는 잠겨 있다. 다른 객체로 교체하는 것은 막는다. 하지만 `state.user`가 가리키는 객체 안의 `role`은 별도로 동결하지 않았으므로 여전히 바꿀 수 있다.

React나 Redux에서 상태를 다루다 보면 이런 중첩 구조가 자주 나온다. `Object.freeze` 하나로는 충분하지 않다.

### Deep freeze 직접 구현

중첩 객체까지 모두 동결하려면 재귀적으로 `freeze`를 적용해야 한다.

```javascript
function deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach((name) => {
    const value = obj[name];
    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  });
  return Object.freeze(obj);
}

const state = deepFreeze({
  user: { name: 'Alice', role: 'admin' },
  count: 0,
});

state.user.role = 'user'; // 이제 실패
```

이 구현은 작동하지만 두 가지 문제가 있다. 첫째, 객체 안에 자기 자신을 참조하는 순환 참조가 있으면 무한 루프에 빠진다. 둘째, 중첩이 깊을수록 성능에 부담이 생긴다. 프로덕션에서 쓰려면 `deep-freeze` 같은 라이브러리를 쓰거나, 아예 다른 접근을 택하는 편이 낫다.

실무에서 `Object.freeze`는 주로 설정 객체, 열거형 상수, 외부에 노출되는 API 응답 객체처럼 "한 번 만들고 변경할 일이 없는" 데이터에 쓴다. 동적으로 바뀌는 상태에 쓰기엔 다루기 불편하다.

## structuredClone(): 2022년 표준화된 깊은 복사

불변성을 지키는 가장 직접적인 방법은 수정이 필요할 때 원본을 바꾸지 않고 복사본을 만드는 것이다. 그런데 JS에서 객체를 복사하는 방법이 여러 가지인데, 각자 한계가 다르다.

스프레드 연산자(`{ ...obj }`)와 `Object.assign`은 얕은 복사다. 중첩 객체는 참조를 공유하므로, 복사본의 중첩 속성을 바꾸면 원본도 바뀐다.

깊은 복사의 전통적인 방법은 JSON이다.

```javascript
const clone = JSON.parse(JSON.stringify(original));
```

간단하지만 문제가 많다. `Date` 객체가 문자열로 변환되고, `Map`과 `Set`은 빈 객체로 변한다. `undefined`와 `Function`은 통째로 사라진다. `Symbol` 키를 가진 속성도 복사되지 않는다.

이 문제를 해결하기 위해 2022년 브라우저와 Node.js 17+에 `structuredClone`이 표준으로 추가됐다.

```javascript
// Before: JSON 방식
const clone = JSON.parse(JSON.stringify(original)); // Date → string으로 변환됨

// After: structuredClone
const clone = structuredClone(original); // Date, Map, Set, ArrayBuffer 지원
```

`structuredClone`이 올바르게 처리하는 타입: `Date`, `Map`, `Set`, `ArrayBuffer`, `RegExp`, 그리고 순환 참조 객체까지 처리한다.

```javascript
const original = {
  createdAt: new Date(),
  data: new Map([['key', 'value']]),
  tags: new Set(['a', 'b']),
};

const clone = structuredClone(original);
clone.createdAt.setFullYear(2000); // original.createdAt에 영향 없음

console.log(original.createdAt.getFullYear()); // 2026 — 그대로
```

복사 후 `clone.createdAt`을 수정해도 `original.createdAt`은 바뀌지 않는다. 진짜 독립적인 복사본이다.

단, `Function`이 포함된 객체는 복사할 수 없다. 클래스 인스턴스 메서드, 클로저, 이벤트 핸들러가 있으면 `TypeError`가 발생한다. DOM 노드도 복사되지 않는다. 순수 데이터 객체에는 잘 맞지만, 복잡한 클래스 인스턴스에는 맞지 않는다.

또 하나 고려할 점은 성능이다. `structuredClone`은 객체 트리 전체를 복사한다. 객체 하나를 바꾸기 위해 1만 개 항목이 들어있는 배열 전체를 복사하는 것은 낭비다. 이 문제를 해결하는 게 다음에 나올 Immer다.

## Immer: Proxy 기반 구조적 공유

`structuredClone`의 한계를 요약하면, "변경과 무관한 부분까지 모두 복사한다"는 것이다. 상태 트리가 크면 클수록 비용이 커진다.

Immer의 `produce`는 이 문제를 다르게 푼다. 변경된 노드와 그 조상만 새 객체를 만들고, 변경되지 않은 나머지는 기존 참조를 그대로 유지한다. 이것을 구조적 공유(structural sharing)라고 한다.

어떻게 이게 가능한지 이해하려면 Immer가 내부적으로 ES6 `Proxy`를 쓴다는 것을 알면 된다. `produce`에 넘기는 `draft`는 원본 객체가 아니라 Proxy로 감싼 가짜 객체다. `draft`에 대한 모든 변경을 기록만 해두고, `produce`가 끝나면 기록된 변경 경로를 따라 필요한 부분만 새 객체로 만든다. 변경되지 않은 부분은 원본 참조를 그대로 붙인다.

```javascript
import { produce } from 'immer';

const state = {
  users: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' },
  ],
  count: 2,
};

const nextState = produce(state, (draft) => {
  draft.users[0].role = 'user'; // Alice의 role만 변경
});

console.log(nextState === state);                   // false: 새 객체
console.log(nextState.users[1] === state.users[1]); // true: Bob은 동일 참조
```

`nextState`는 새 객체다. 하지만 변경되지 않은 `users[1]`(Bob)은 `state.users[1]`과 완전히 같은 참조를 공유한다. 복사하지 않았다.

이 특성이 React에서 중요하게 작동한다. `React.memo`나 `useMemo`는 props나 값이 이전과 같은 참조인지(`===`) 비교해서 리렌더링 여부를 결정한다. `structuredClone`으로 전체를 복사하면 변경되지 않은 부분도 새 참조가 되어 불필요한 리렌더링이 발생한다. Immer는 바뀐 부분만 새 참조를 만들기 때문에, `memo`가 정확하게 작동한다.

### React useState와 조합

중첩 상태를 스프레드 연산자로 업데이트하면 코드가 금방 지저분해진다. 배열 안의 특정 항목의 특정 속성을 바꾸는 코드를 보자.

```javascript
// 스프레드 방식
setUsers(prev =>
  prev.map(u =>
    u.id === id ? { ...u, active: !u.active } : u
  )
);
```

이 정도면 아직 읽을 수 있다. 하지만 중첩이 한 단계 더 깊어지면 스프레드가 두세 번 중첩된다. Immer는 draft 객체를 직접 수정하는 문법으로 상태를 업데이트한다.

```javascript
import { produce } from 'immer';
import { useState } from 'react';

function UserList() {
  const [users, setUsers] = useState([
    { id: 1, name: 'Alice', active: true },
    { id: 2, name: 'Bob', active: false },
  ]);

  const toggleUser = (id) => {
    setUsers(produce((draft) => {
      const user = draft.find((u) => u.id === id);
      if (user) user.active = !user.active;
    }));
  };
}
```

`produce`를 인자 하나로 호출하면(커링) 업데이터 함수를 반환한다. `setUsers`가 받는 형식과 딱 맞아서 바로 넘길 수 있다. 내부에서 `draft.find`로 원하는 항목을 찾아 직접 수정하면 Immer가 그 변경만 추적해서 새 배열을 만든다.

## Record & Tuple: 언어 레벨 불변 원시값

지금까지 살펴본 도구들은 모두 라이브러리나 API다. 객체 자체는 여전히 mutable이고, 불변성은 코딩 관례와 도구의 조합으로 지킨다. 언어 레벨에서 아예 불변인 객체와 배열을 만들 수 있다면 어떨까.

TC39의 Record & Tuple 제안이 이것을 목표로 한다. 2026년 현재 Stage 2 상태라 아직 표준이 아니다. 실무에 쓰기보다는 JavaScript가 향후 어떤 방향으로 가려는지 알아두는 차원에서 소개한다.

```javascript
// Record: 불변 객체 리터럴 (# 접두사)
const point = #{ x: 1, y: 2 };

// Tuple: 불변 배열 리터럴
const rgb = #[255, 128, 0];

// 값 동등성 비교 (참조가 아니라 값으로)
#{ x: 1, y: 2 } === #{ x: 1, y: 2 }; // true (일반 객체는 false)

// 변경 시도 → TypeError
point.x = 10; // TypeError
```

일반 객체는 내용이 같아도 참조가 다르면 `===`가 `false`다. Record와 Tuple은 값이 같으면 항상 `===`가 `true`다. 숫자나 문자열처럼 값 자체로 비교한다.

이것이 실용화되면 React 상태 비교, Map/Set 키 사용, 메모이제이션에서 지금보다 훨씬 직관적인 코드를 쓸 수 있다. 당장은 Immer나 `structuredClone`으로 해결하고, 이 제안의 진행은 지켜보는 것이 현실적이다.

## 성능: 불변이 mutable보다 빠른 경우

"복사하면 느리지 않나"는 자주 나오는 우려다. 완전히 틀린 말은 아닌데, 상황에 따라 다르다.

**불변 방식이 오히려 빠른 대표적인 케이스는 변경 감지다.** mutable 객체에서 "이 데이터가 바뀌었나?"를 확인하려면 이전 상태와 현재 상태를 속성 하나하나 비교해야 한다. 객체가 크고 중첩이 깊을수록 비교 비용이 커진다.

불변 방식에서는 다르다. 데이터가 바뀌면 반드시 새 참조가 생긴다. 바뀌지 않으면 참조가 그대로다. 그러므로 `prev === next` 한 번으로 변경 여부를 알 수 있다. React, Vue, Svelte가 렌더링 최적화에 참조 비교를 쓰는 이유가 바로 이것이다.

Immer의 구조적 공유를 쓰면 복사 비용도 최소화된다. 1,000개 항목 배열에서 하나만 바꾸면, 1,000개를 복사하지 않고 바뀐 항목과 그 조상만 새로 만든다. 나머지 999개는 참조를 공유한다.

**반대로 mutable이 더 적합한 경우도 있다.** 수백만 건의 데이터를 루프로 처리할 때 매 이터레이션마다 새 객체를 만들면 가비지 컬렉터에 부담이 쌓인다. 게임 루프나 WebGL 렌더링처럼 초당 수십 번 실행되는 코드에서 메모리 할당이 병목이 되는 경우가 있다.

요약하면, UI 상태 관리에서는 불변성이 이득이다. 순수 데이터 처리 파이프라인이나 고빈도 업데이트가 필요한 계산 집약적 코드에서는 상황을 보고 판단한다.

## 선택 기준

각 도구가 어떤 상황에 맞는지 정리하면 이렇다.

| 상황 | 권장 |
|------|------|
| 간단한 객체 깊은 복사 | `structuredClone` |
| 중첩 상태 업데이트, React/Redux | Immer `produce` |
| 설정 객체 변경 방지 | `Object.freeze` |
| TypeScript 컴파일 타임 불변성 | `Readonly<T>`, `as const` |
| 함수형, 데이터 파이프라인 | Ramda, fp-ts |

TypeScript를 쓴다면 `as const`와 `Readonly<T>`부터 살펴볼 만하다. 런타임에 아무것도 추가하지 않고, 컴파일 타임에 뮤테이션 시도를 오류로 잡는다.

```typescript
const config = {
  host: 'localhost',
  port: 3000,
} as const;

config.port = 8080; // TypeScript 오류: Cannot assign to 'port' because it is a read-only property
```

`as const`는 객체의 모든 속성을 `readonly`로 만들고 타입을 리터럴 타입으로 좁힌다. `{ host: string, port: number }`가 아니라 `{ readonly host: 'localhost', readonly port: 3000 }`가 된다. 런타임 동작은 그대로지만 타입 수준에서 변경을 막는다.

런타임에서도 변경을 막아야 한다면 `Object.freeze`, 중첩 상태를 자주 업데이트해야 한다면 Immer, 한 번만 깊은 복사가 필요하다면 `structuredClone`. 이 세 가지가 JavaScript 불변성 도구의 핵심이다.

## 참고 자료

- [Immer 공식 문서](https://immerjs.github.io/immer/) — produce, 구조적 공유, React 통합 가이드
- [MDN: structuredClone()](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone) — 지원 타입, 브라우저 호환성
- [TC39 Record & Tuple 제안](https://github.com/tc39/proposal-record-tuple) — Stage 2 스펙 및 플레이그라운드
