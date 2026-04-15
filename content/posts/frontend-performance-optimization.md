---
title: '프론트엔드 성능 최적화: 흔히 놓치는 6가지'
date: 2026-04-15
description: 리렌더링, 이미지, 번들, 레이아웃 쉬프트, 이벤트 핸들러, GPU 렌더링. 각각의 Before/After를 코드로 정리한다.
tags: [frontend, performance, optimization, react, css]
slug: frontend-performance-optimization
category: engineering
published: true
---

프론트엔드 성능 최적화는 거창한 게 아니다. 대부분은 "알면 바로 고칠 수 있는데, 모르면 계속 방치되는" 것들이다. Lighthouse 점수가 낮은 이유를 파고 들어가면, 결국 몇 가지 반복되는 패턴에 수렴한다.

이 글에서는 실무에서 자주 만나는 6가지 최적화 포인트를 정리한다. 각각 왜 문제인지, 어떻게 고치는지를 Before/After 코드로 보여준다.

## 1. 불필요한 리렌더링

React에서 상태(state)가 바뀌면 해당 컴포넌트와 **모든 자식 컴포넌트**가 재렌더링된다. 자식이 그 상태와 전혀 관련 없어도. 이게 기본 동작이다.

### 상태를 너무 높은 곳에 두는 실수

가장 흔한 패턴이다. 검색 입력값 같은 로컬 상태를 최상위 컴포넌트에 올려놓으면, 키 하나 누를 때마다 앱 전체가 재렌더링된다.

```jsx
// Before: 입력할 때마다 HeavyList, Sidebar까지 전부 재렌더링
function App() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div>
      <SearchInput value={searchQuery} onChange={setSearchQuery} />
      <HeavyList />
      <Sidebar />
    </div>
  )
}
```

```jsx
// After: 상태를 필요한 컴포넌트 안으로 내린다
function SearchInput() {
  const [searchQuery, setSearchQuery] = useState('')
  return <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
}

function App() {
  return (
    <div>
      <SearchInput />
      <HeavyList />
      <Sidebar />
    </div>
  )
}
```

이걸 "상태 하강(state lowering)"이라 부른다. 상태를 실제로 쓰는 컴포넌트 안으로 내리면, 그 컴포넌트만 재렌더링된다. 가장 간단하면서 효과가 큰 최적화다.
### memo + useCallback 조합

상태를 내릴 수 없는 구조라면, `React.memo`로 자식 컴포넌트의 불필요한 리렌더링을 막을 수 있다. 다만 주의할 점이 있다. 부모가 렌더링될 때마다 새로 만들어지는 함수를 prop으로 내려보내면 `memo`가 무력화된다.

```jsx
// Before: handleClick이 매 렌더마다 새로 생성되므로 memo 효과 없음
function Parent() {
  const [count, setCount] = useState(0)
  const handleClick = () => console.log('clicked')

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>카운트: {count}</button>
      <ExpensiveChild onClick={handleClick} />
    </div>
  )
}
```

```jsx
// After: useCallback으로 함수 참조 안정화
const ExpensiveChild = React.memo(function ExpensiveChild({ onClick }) {
  return <button onClick={onClick}>비싼 컴포넌트</button>
})

function Parent() {
  const [count, setCount] = useState(0)
  const handleClick = useCallback(() => console.log('clicked'), [])

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>카운트: {count}</button>
      <ExpensiveChild onClick={handleClick} />
    </div>
  )
}
```

`memo`만 쓰고 `useCallback`을 빠뜨리는 경우가 정말 많다. `memo`는 prop이 변하지 않았을 때만 재렌더링을 건너뛴다. 함수 prop이 매번 새 참조면 항상 "변했다"고 판단한다.

### key에 index 쓰지 않기

```jsx
// Before: 리스트 변경 시 모든 항목이 재마운트
{items.map((item, index) => (
  <ItemCard key={index} item={item} />
))}

// After: 안정적인 고유 ID 사용
{items.map(item => (
  <ItemCard key={item.id} item={item} />
))}
```

`key={index}`는 리스트 중간에 항목이 추가되거나 삭제될 때 React가 DOM을 잘못 재사용하게 만든다. 버그와 성능 저하를 동시에 유발한다.

## 2. 이미지와 폰트 로딩

이미지와 폰트는 LCP(Largest Contentful Paint)와 CLS(Cumulative Layout Shift)에 직접 영향을 주는 요소다. 포맷을 바꾸고 로딩 전략을 조정하는 것만으로 눈에 띄는 개선이 가능하다.

### 이미지 포맷

JPEG을 기준으로 WebP는 25~35%, AVIF는 약 50%까지 용량을 줄인다. 화질 차이는 거의 없다.

```html
<!-- Before -->
<img src="hero.jpg" alt="히어로 이미지">

<!-- After: picture 태그로 포맷 분기 + 폴백 -->
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="히어로 이미지" width="1200" height="600">
</picture>
```

브라우저가 AVIF를 지원하면 AVIF를, 아니면 WebP를, 둘 다 안 되면 JPEG을 쓴다. `<picture>` 태그 하나로 해결된다.

### lazy loading과 preload

```html
<!-- 첫 화면 히어로 이미지: preload로 빠르게 -->
<link rel="preload" as="image" href="hero.webp" type="image/webp">

<!-- 뷰포트 밖 이미지: lazy loading -->
<img src="below-fold.webp" loading="lazy" alt="..." width="800" height="400">
```

주의할 점: `loading="lazy"`를 첫 화면 이미지에 걸면 오히려 LCP가 나빠진다. 브라우저가 뷰포트에 들어올 때까지 로딩을 미루기 때문이다. 첫 화면 이미지는 `eager`(기본값)를 유지하고, 가능하면 `preload`까지 걸어주는 게 맞다.

### 폰트: FOIT 방지

커스텀 폰트를 쓰면 폰트가 로드되기 전까지 텍스트가 안 보이는 현상(FOIT, Flash of Invisible Text)이 발생할 수 있다.

```css
/* Before: font-display 없으면 기본적으로 텍스트가 숨겨진다 */
@font-face {
  font-family: 'MyFont';
  src: url('myfont.woff2') format('woff2');
}

/* After: swap으로 시스템 폰트 먼저 보여주기 */
@font-face {
  font-family: 'MyFont';
  src: url('myfont.woff2') format('woff2');
  font-display: swap;
}
```

```html
<!-- 폰트 preload로 다운로드 시작을 앞당긴다 -->
<link rel="preload" href="myfont.woff2" as="font" type="font/woff2" crossorigin>
```

`font-display: swap`은 폰트가 준비될 때까지 시스템 폰트를 보여준다. 텍스트가 잠깐 다른 모양으로 보이지만(FOUT), 안 보이는 것보다는 낫다.

## 3. 번들 사이즈

번들이 크면 브라우저가 JavaScript를 파싱하고 실행하는 시간이 늘어난다. TTI(Time to Interactive)가 느려지는 직접적인 원인이다.

### 동적 import

```jsx
// Before: 모든 페이지가 초기 번들에 포함
import Dashboard from './Dashboard'
import Settings from './Settings'
import Analytics from './Analytics'
```

```jsx
// After: 라우트별로 분할, 필요할 때만 로드
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./Dashboard'))
const Settings = lazy(() => import('./Settings'))
const Analytics = lazy(() => import('./Analytics'))

function App() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  )
}
```

사용자가 `/dashboard`에 접속하면 Dashboard 코드만 받는다. Settings, Analytics는 해당 페이지에 갈 때 비로소 로드된다. 초기 번들이 40~60% 줄어드는 경우가 흔하다.

### barrel export 주의

```typescript
// components/index.ts (barrel export)
export { Button } from './Button'
export { Modal } from './Modal'
export { DataTable } from './DataTable'  // 무거운 차트 라이브러리 포함
```

```typescript
// Before: Button만 필요한데 DataTable까지 번들에 포함
import { Button } from './components'

// After: 직접 경로로 import
import { Button } from './components/Button'
```

barrel export(index.ts에서 모든 모듈을 re-export하는 패턴)는 편리하지만, 번들러의 tree shaking을 방해할 수 있다. 특히 사이드 이펙트가 있는 모듈이 섞여 있으면, 사용하지 않는 코드까지 번들에 포함된다. `package.json`에 `"sideEffects": false`를 명시하면 개선되지만, 확실한 건 직접 경로로 import하는 것이다.

### 번들 분석

어디가 문제인지 모르면 최적화할 수도 없다. 번들 분석 도구로 현황을 먼저 파악해야 한다.

```bash
# Vite
npx vite-bundle-visualizer

# Webpack
npx webpack-bundle-analyzer stats.json

# Next.js
npm install @next/bundle-analyzer
```

의외로 큰 비중을 차지하는 게 `moment.js`(288KB)나 `lodash`(72KB) 전체 import 같은 경우다. `date-fns`나 `lodash-es`로 바꾸면 수십 KB를 절약할 수 있다.
## 4. 레이아웃 쉬프트

CLS(Cumulative Layout Shift)는 페이지 로드 중 요소가 갑자기 이동하는 정도를 측정하는 Core Web Vitals 지표다. 0.1 이하가 "양호". 기사를 읽는 도중 광고가 끼어들어 버튼 위치가 밀려나는 것, 그게 레이아웃 쉬프트다.

### 이미지 크기 지정

```html
<!-- Before: 이미지 로드 전 높이가 0이다가 로드 후 300px 확보 -->
<img src="product.webp" alt="상품">

<!-- After: width/height로 브라우저가 공간을 미리 예약 -->
<img src="product.webp" alt="상품" width="400" height="300">
```

CSS `aspect-ratio`로도 같은 효과를 낼 수 있다.

```css
img {
  width: 100%;
  aspect-ratio: 4 / 3;
}
```

이미지 크기를 명시하는 것만으로 CLS가 0.3에서 0.05로 떨어지는 경우도 있다. 가장 쉬우면서 효과가 큰 최적화 중 하나다.

### Skeleton UI

```jsx
// Before: 데이터 로드 전 아무것도 안 보이다가 갑자기 콘텐츠 등장
function UserProfile() {
  const [user, setUser] = useState(null)
  if (!user) return null
  return <div className="profile">{user.name}</div>
}
```

```jsx
// After: 실제 콘텐츠와 같은 크기의 skeleton으로 공간 유지
function UserProfile() {
  const [user, setUser] = useState(null)

  if (!user) {
    return (
      <div className="skeleton">
        <div className="skeleton-avatar" />
        <div className="skeleton-text" />
      </div>
    )
  }
  return <div className="profile">{user.name}</div>
}
```

```css
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

Skeleton의 핵심은 "실제 콘텐츠와 같은 크기"다. Skeleton과 실제 콘텐츠의 높이가 다르면 결국 레이아웃 쉬프트가 발생한다.
## 5. 이벤트 핸들러

스크롤, 리사이즈, 입력 이벤트는 초당 수십에서 수백 번 발생한다. 핸들러가 조금이라도 무거우면 메인 스레드가 막히고, UI가 버벅인다.

### debounce와 throttle

둘 다 이벤트 호출 빈도를 줄이는 기법이지만, 쓰임새가 다르다.

**debounce: 마지막 이벤트 이후 일정 시간 지나면 실행.** 검색 입력에 적합하다.

```typescript
// Before: 글자 하나 칠 때마다 API 호출
input.addEventListener('input', (e) => {
  fetchSearchResults(e.target.value)
})

// After: 입력이 멈춘 후 300ms 뒤에 한 번만 호출
function debounce(fn: Function, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

input.addEventListener('input', debounce((e: Event) => {
  fetchSearchResults((e.target as HTMLInputElement).value)
}, 300))
```

**throttle: 일정 간격마다 한 번씩 실행.** 스크롤, 마우스무브에 적합하다.

```typescript
// Before: 스크롤 이벤트마다 레이아웃 재계산
window.addEventListener('scroll', () => {
  updateParallaxPositions()
})

// After: 최대 60fps로 제한
function throttle(fn: Function, limit: number) {
  let lastRun = 0
  return (...args: any[]) => {
    const now = Date.now()
    if (now - lastRun >= limit) {
      lastRun = now
      fn(...args)
    }
  }
}

window.addEventListener('scroll', throttle(updateParallaxPositions, 16))
```

debounce는 "연타가 끝나면 실행", throttle은 "일정 주기로 실행". 검색 입력에 throttle을 쓰면 타이핑 중간에 불필요한 호출이 발생하고, 스크롤에 debounce를 쓰면 스크롤이 끝난 후에야 한 번 업데이트되어 뚝뚝 끊긴다.
### passive listener

```typescript
// Before: 브라우저가 preventDefault() 호출 여부를 매번 확인하며 대기
window.addEventListener('scroll', handler)
window.addEventListener('touchstart', handler)

// After: "이 핸들러는 스크롤을 막지 않겠다"고 선언
window.addEventListener('scroll', handler, { passive: true })
window.addEventListener('touchstart', handler, { passive: true })
```

`passive: true`를 주면 브라우저가 핸들러의 `preventDefault()` 호출 가능성을 무시하고 스크롤을 즉시 처리한다. 특히 모바일 터치 스크롤에서 체감 차이가 크다. Chrome DevTools에서 "Non-passive event listener" 경고가 뜨면 바로 수정 대상이다.

### requestAnimationFrame

```typescript
// Before: setTimeout으로 UI 업데이트. 브라우저 렌더링 사이클과 어긋남
window.addEventListener('scroll', () => {
  setTimeout(() => {
    element.style.transform = `translateY(${window.scrollY * 0.5}px)`
  }, 16)
})

// After: 브라우저의 다음 프레임에 맞춰 실행
let ticking = false
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      element.style.transform = `translateY(${window.scrollY * 0.5}px)`
      ticking = false
    })
    ticking = true
  }
})
```

`requestAnimationFrame`은 브라우저가 다음 화면을 그리기 직전에 콜백을 실행한다. `setTimeout(fn, 16)`과 결과적으로 비슷해 보이지만, `setTimeout`은 렌더링 사이클과 동기화가 안 되어 프레임 드롭이 발생할 수 있다. 애니메이션이나 스크롤 기반 UI 업데이트에는 항상 `requestAnimationFrame`을 써야 한다.
## 6. CPU vs GPU 렌더링

브라우저가 CSS 변경 사항을 화면에 반영할 때, 세 단계를 거친다.

```
Layout (CPU) → Paint (CPU) → Composite (GPU)
```

어떤 CSS 속성을 바꾸느냐에 따라 세 단계를 전부 탈 수도 있고, GPU의 Composite만 탈 수도 있다.

| 단계 | 비용 | 트리거하는 속성 |
|---|---|---|
| Layout | 높음 | width, height, top, left, margin, padding |
| Paint | 중간 | color, background, border, box-shadow |
| Composite | 낮음 | transform, opacity |

### CSS: transform vs top/left

```css
/* Before: top/left 애니메이션. 매 프레임 Layout + Paint + Composite */
.modal {
  position: absolute;
  top: 0;
  left: 0;
  transition: top 0.3s, left 0.3s;
}

.modal.open {
  top: 50%;
  left: 50%;
}

/* After: transform 애니메이션. Composite만 실행, GPU가 처리 */
.modal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  transition: transform 0.3s, opacity 0.3s;
}

.modal.open {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
}
```

`top`/`left`를 바꾸면 브라우저가 주변 요소의 위치를 전부 다시 계산(Layout)한다. `transform`은 해당 요소만 GPU에서 이동시키므로 다른 요소에 영향을 주지 않는다. 같은 시각적 결과를 내면서 비용이 완전히 다르다.
### will-change 선택적 사용

```css
/* 실제 애니메이션이 발생하는 요소에만 */
.animated-overlay {
  will-change: transform, opacity;
}

/* 애니메이션이 끝나면 해제 */
.animated-overlay.done {
  will-change: auto;
}
```

`will-change`는 브라우저에게 "이 요소가 곧 변할 거다"라고 알려주는 힌트다. GPU가 전용 합성 레이어를 미리 만들어둔다. 하지만 모든 요소에 남발하면 GPU 메모리를 낭비한다. 실제로 애니메이션이 일어나는 요소에만, 필요한 시점에만 적용해야 한다.

### Canvas: CPU에서 GPU로

Canvas2D는 CPU에서 매 프레임 픽셀을 직접 계산한다. 단순한 도형 몇 개는 괜찮지만, 수천 개의 요소를 매 프레임 그리면 메인 스레드가 막힌다.

```typescript
// Before: Canvas2D로 매 프레임 파티클 렌더링. CPU 부하 급증
const ctx = canvas.getContext('2d')!

function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  particles.forEach(p => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = p.color
    ctx.fill()
  })
  requestAnimationFrame(drawFrame)
}
```

GPU로 옮기는 방법은 두 가지다.

첫째, **WebGL(또는 Three.js, PixiJS 같은 래퍼)**로 렌더링 자체를 GPU에서 처리한다. 수만 개의 파티클도 60fps로 돌릴 수 있다.

둘째, **OffscreenCanvas**로 렌더링 연산을 Web Worker에 넘긴다. 메인 스레드에서 UI 블로킹이 사라진다.

```typescript
// main.ts: Canvas 제어권을 Worker로 전달
const canvas = document.getElementById('canvas') as HTMLCanvasElement
const offscreen = canvas.transferControlToOffscreen()
const worker = new Worker(new URL('./render-worker.ts', import.meta.url), { type: 'module' })
worker.postMessage({ canvas: offscreen }, [offscreen])

// render-worker.ts: Worker에서 렌더링 루프 실행
self.onmessage = (e) => {
  const canvas = e.data.canvas as OffscreenCanvas
  const ctx = canvas.getContext('2d')!
  function drawLoop() {
    // 모든 렌더링 로직이 여기서 실행
    // 메인 스레드는 자유롭다
    requestAnimationFrame(drawLoop)
  }
  drawLoop()
}
```

핵심 원리는 동일하다. 매 프레임 CPU에서 무거운 계산을 하고 있다면, 그 작업을 GPU 텍스처 기반으로 옮기거나 Worker로 분리해서 메인 스레드의 부담을 없앤다. 오버레이에 매 프레임 CPU로 그리던 것을 GPU 텍스처 기반으로 옮기면 메인 스레드 부하가 사라진다. CSS든 Canvas든, "Composite만 남기고 나머지를 줄인다"는 관점으로 접근하면 된다.
## 체크리스트

| 항목 | 핵심 액션 | 영향 지표 |
|---|---|---|
| 리렌더링 | 상태 하강, memo+useCallback, key에 고유 ID | JS 실행 시간 |
| 이미지/폰트 | WebP/AVIF, lazy loading, preload, font-display: swap | LCP, CLS |
| 번들 | dynamic import, barrel export 피하기, 번들 분석 | TTI, FCP |
| 레이아웃 쉬프트 | width/height 지정, skeleton UI | CLS |
| 이벤트 | debounce/throttle, passive listener, rAF | FPS, 메인 스레드 |
| GPU 렌더링 | transform/opacity, will-change, OffscreenCanvas | FPS, CPU 사용률 |

성능 최적화에서 가장 중요한 건 **측정 먼저, 최적화 나중**이다. Chrome DevTools의 Performance 탭, Lighthouse, React DevTools Profiler로 병목 지점을 먼저 찾고, 그 지점에 맞는 해법을 적용해야 한다. 감으로 하는 최적화는 효과가 없거나, 가독성만 떨어뜨리는 경우가 많다.

## 참고 자료

- [Optimize Cumulative Layout Shift - web.dev](https://web.dev/articles/optimize-cls) - CLS 최적화 가이드
- [Chrome Lighthouse - Serve images in modern formats](https://developer.chrome.com/docs/lighthouse/performance/uses-webp-images) - 이미지 포맷 최적화
- [Tree Shaking - webpack](https://webpack.js.org/guides/tree-shaking/) - tree shaking 원리와 설정
- [CSS Animation Performance](https://cr0x.net/en/css-animations-performance-rules/) - GPU 합성과 애니메이션 성능
- [SVG vs Canvas vs WebGL Performance](https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025) - 렌더링 방식별 성능 비교
