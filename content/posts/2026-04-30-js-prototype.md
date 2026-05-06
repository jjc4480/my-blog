---
title: "JavaScript 프로토타입 체인: __proto__부터 class까지"
description: "__proto__, prototype, Object.create, class의 관계를 코드로 정리한다. instanceof 함정, prototype pollution 보안 이슈, 믹스인 패턴까지."
date: "2026-04-30"
tags: ["javascript", "prototype", "oop", "inheritance", "security"]
category: "언어"
published: false
---

## class는 문법 설탕이다

2015년 ES6에서 `class` 키워드가 도입됐다. 많은 개발자가 Java나 Python처럼 클래스 기반 OOP가 JS에 들어온 것으로 이해했다. 틀렸다.

`class`는 프로토타입 체인 위에 얹은 문법 설탕(syntactic sugar)이다. 내부는 여전히 prototype이 작동한다. 이것을 모르면 상속이 이상하게 작동할 때, `instanceof`가 예상과 다른 결과를 낼 때, 디버거를 봐도 뭔가 맞지 않을 때 원인을 찾을 수 없다.

## [[Prototype]], `__proto__`, `Object.getPrototypeOf`

JS의 모든 객체는 내부적으로 `[[Prototype]]`이라는 슬롯을 가진다. 다른 객체를 가리키는 링크다. 속성을 찾을 때 현재 객체에 없으면 이 링크를 따라 올라가서 찾는다. 이것이 프로토타입 체인이다.

`__proto__`는 `[[Prototype]]`에 접근하는 비표준 접근자다. 브라우저 호환성을 위해 표준에 포함됐지만, 코드에서 직접 쓰지 않는 것이 좋다.

```javascript
const obj = { name: 'Alice' };

// 비권장: 직접 접근
console.log(obj.__proto__ === Object.prototype); // true

// 권장: 표준 API
console.log(Object.getPrototypeOf(obj) === Object.prototype); // true

// 프로토타입 설정
Object.setPrototypeOf(obj, null); // 체인 끊기
```

`__proto__` 쓰는 코드를 발견하면 `Object.getPrototypeOf()` / `Object.setPrototypeOf()`로 바꾼다.

## `prototype` 프로퍼티: 함수만 가진다

혼동 포인트가 여기 있다. `[[Prototype]]`은 모든 객체가 가지는 내부 슬롯이고, `.prototype`은 함수 객체만 가지는 일반 프로퍼티다.

```javascript
function Person(name) {
  this.name = name;
}

console.log(typeof Person.prototype); // 'object'
console.log(Person.prototype.constructor === Person); // true

const alice = new Person('Alice');
console.log(Object.getPrototypeOf(alice) === Person.prototype); // true
```

`Person.prototype`은 `new Person()`으로 만든 인스턴스들이 공유하는 객체다. 메서드를 여기 올려두면 인스턴스마다 복사하지 않고 하나를 공유한다.

## `new`가 실제로 하는 4단계

`new Person('Alice')`는 내부적으로 이 순서로 동작한다.

```javascript
function simulateNew(Constructor, ...args) {
  // 1. 빈 객체 생성
  const instance = Object.create(Constructor.prototype);

  // 2. 생성자 호출 (this = instance)
  const result = Constructor.apply(instance, args);

  // 3. 생성자가 객체를 반환하면 그것을 사용, 아니면 instance 반환
  return result instanceof Object ? result : instance;
}

const alice = simulateNew(Person, 'Alice');
console.log(alice.name); // 'Alice'
console.log(alice instanceof Person); // true
```

`Object.create(Constructor.prototype)`이 핵심이다. 새 객체의 `[[Prototype]]`을 생성자의 `prototype`으로 연결한다.

## `Object.create(null)`: prototype 없는 순수 딕셔너리

`{}`로 만든 객체는 `Object.prototype`을 상속한다. `toString`, `hasOwnProperty`, `valueOf` 같은 메서드가 기본으로 붙는다. 키-값 저장소로 쓸 때 이것이 문제를 일으킬 수 있다.

```javascript
const map = {};
map['toString'] = 'custom'; // Object.prototype.toString을 가림

// prototype 없는 순수 객체
const pureMap = Object.create(null);
console.log(Object.getPrototypeOf(pureMap)); // null
console.log(pureMap.toString); // undefined: 상속 없음

pureMap['toString'] = 'safe'; // 충돌 없음
```

설정 파일, 캐시, 빈번한 키 조회가 필요한 딕셔너리는 `Object.create(null)`로 만드는 것이 안전하다.

## class는 어떻게 prototype chain을 만드는가

Babel이 `class`를 ES5로 변환한 결과를 보면 내부가 드러난다.

```javascript
// ES6 class
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    return `${this.name} makes a sound.`;
  }
}

class Dog extends Animal {
  speak() {
    return `${this.name} barks.`;
  }
}
```

Babel 변환 결과 (요약):

```javascript
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return this.name + ' makes a sound.';
};

function Dog() {
  Animal.apply(this, arguments); // super() 호출
}

// 상속 체인 연결
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;

Dog.prototype.speak = function () {
  return this.name + ' barks.';
};
```

`extends`는 두 가지를 한다. `Dog.prototype`의 `[[Prototype]]`을 `Animal.prototype`으로 연결하고, `Dog` 자체의 `[[Prototype]]`을 `Animal`로 연결한다(정적 메서드 상속).

```javascript
const dog = new Dog('Rex');
// 프로토타입 체인: dog → Dog.prototype → Animal.prototype → Object.prototype → null
console.log(dog.speak()); // 'Rex barks.'
```

## `instanceof`의 작동 원리와 함정

`instanceof`는 우변 함수의 `prototype`이 좌변 객체의 프로토타입 체인 어딘가에 있는지 확인한다.

```javascript
console.log(dog instanceof Dog);    // true
console.log(dog instanceof Animal); // true: 체인을 따라 올라감
console.log(dog instanceof Object); // true
```

**cross-realm 문제**: iframe이나 Node.js의 `vm.runInNewContext()`처럼 다른 실행 컨텍스트에서 만든 객체는 `instanceof`가 `false`를 반환한다.

```javascript
const arr = iframe.contentWindow.Array();

arr instanceof Array;             // false: 다른 realm의 Array.prototype
Array.isArray(arr);               // true: realm 무관
Object.prototype.toString.call(arr); // '[object Array]'
```

타입 체크가 중요한 경우 `instanceof` 대신 `Array.isArray()`, `Object.prototype.toString.call()`, 또는 duck typing을 쓴다.

## `hasOwnProperty` vs `Object.hasOwn()`

`for...in`은 프로토타입 체인 전체를 순회한다.

```javascript
function Base() {}
Base.prototype.shared = true;

const obj = new Base();
obj.own = 'mine';

for (const key in obj) {
  console.log(key); // 'own', 'shared' 모두 출력
}
```

자신의 속성만 확인하려면:

```javascript
// 구식: Object.create(null) 객체에서 오류 가능
obj.hasOwnProperty('own');

// ES2022: 안전한 대안
Object.hasOwn(obj, 'own');    // true
Object.hasOwn(obj, 'shared'); // false
```

`Object.hasOwn()`은 `Object.prototype`에 의존하지 않아서 어떤 객체에도 안전하게 쓸 수 있다.

## prototype 오염: 보안 취약점

prototype chain을 이용한 공격 패턴이다. prototype pollution이라 부른다.

```javascript
// 외부 입력을 객체에 병합하는 코드
function merge(target, source) {
  for (const key in source) {
    target[key] = source[key];
  }
}

const malicious = JSON.parse('{"__proto__": {"admin": true}}');
merge({}, malicious);

// 모든 객체에 admin이 붙어버린다
const victim = {};
console.log(victim.admin); // true
```

`lodash`의 `merge`, `jQuery`의 `extend` 등이 실제로 이 취약점에 노출된 이력이 있다.

방어 패턴:

```javascript
function safeMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    target[key] = source[key];
  }
}
```

외부 입력을 객체에 병합할 때는 키를 반드시 검증한다.

## 믹스인(Mixin) 패턴

단일 상속만 지원하는 JS에서 여러 기능을 조합하는 실용적인 방법이다.

```javascript
const Serializable = {
  serialize() {
    return JSON.stringify(this);
  },
};

const Validatable = {
  validate() {
    return Object.keys(this).every((key) => this[key] !== null);
  },
};

class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
}

Object.assign(User.prototype, Serializable, Validatable);

const user = new User('Alice', 'alice@example.com');
console.log(user.serialize()); // '{"name":"Alice","email":"alice@example.com"}'
console.log(user.validate());  // true
```

상속 계층을 깊게 쌓는 것보다 필요한 기능을 믹스인으로 조합하는 편이 유지보수하기 쉽다. 깊은 체인은 속성 조회 비용이 체인 길이에 비례해서 증가한다.

## 참고 자료

- [MDN: 상속과 프로토타입 체인](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) — [[Prototype]] 내부 슬롯, 체인 탐색 동작
- [javascript.info: 프로토타입 상속](https://javascript.info/prototype-inheritance) — 단계별 코드 예제와 도식
