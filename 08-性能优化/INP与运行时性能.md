# INP 与运行时性能

## INP 差的根因

常见根因是主线程长任务、事件处理过重、框架提交或样式/布局太慢。
Long Tasks API 将超过 50ms 的任务标记为长任务，但 INP 还包含处理和呈现延迟，
不能只看一条 50ms 阈值。

INP 的三段构成：

```
INP = 输入延迟（等主线程空闲） + 处理时间（事件handler） + 呈现延迟（渲染下一帧）
```

---

## 优化手段

### 1. 拆分长任务

```js
// 让出主线程，给浏览器处理输入的机会
if ('scheduler' in globalThis && 'yield' in scheduler) {
	await scheduler.yield();
} else {
	await new Promise((resolve) => setTimeout(resolve, 0));
}
```

大数组处理、复杂计算要分片，不要一次跑完。
`scheduler.yield()` 的浏览器支持仍需根据目标环境检查；
`setTimeout(0)` 是降级思路，与 `scheduler.yield()` 的调度优先级语义不完全等价。

### 2. 减少 hydration 成本

SSR 页面在水合前可以显示 HTML，但依赖客户端事件处理器的交互
可能需等待相关代码与水合。原生链接和具有渐进增强的表单
可以早于完整水合工作。水合可能是 INP 问题之一，
但不能不经度量就说是主要原因。

- 减少 Client Component 的量
- 用流式渲染 + 选择性水合，让重要部分先可交互

### 3. 把重计算移出主线程

Web Worker 处理数据解析、加解密、大量计算。

### 4. React 特有手段

```jsx
// 输入立即响应，列表渲染可被打断
setQuery(value);
startTransition(() => setResults(filter(value)));
```

> 详见 [05-React 生态/Fiber 与并发特性.md](../05-React生态/Fiber与并发特性.md)

### 5. 事件处理器里别做重活

**先给用户即时反馈**（改个 loading 态、按钮置灰），
重活放到下一帧或异步。

用户要的是"我点了有反应"，不是"点了立刻算完"。

---

## React 页面越来越卡，怎么排查

**1. React DevTools Profiler 录制**
看哪些组件重渲染、渲染耗时多少、为什么渲染
（Profiler 会告诉你是 props 变了还是 hook 变了）

**2. 开启 "Highlight updates when components render"**
直观看到哪些区域在无谓重渲染——
很多问题一眼就能看出来（比如输入一个字符整个页面都在闪）

**3. 常见根因**

| 根因                           | 表现               | 修法                      |
| ------------------------------ | ------------------ | ------------------------- |
| **Context value 每次是新对象** | 所有消费者重渲染   | `useMemo` 稳定 value      |
| **列表没做虚拟滚动**           | 几千个 DOM 节点    | react-window / 虚拟滚动   |
| 大量内联函数/对象              | `memo` 失效        | `useCallback` / 提到外面  |
| **定时器/订阅没清理**          | 越积越多，越来越卡 | effect 里 return 清理函数 |
| 在渲染中做重计算               | 每次渲染都算一遍   | `useMemo`                 |

---

## 长列表怎么办

**虚拟滚动的核心思路**：
只渲染可视区 + 上下 buffer 的元素，
用 padding 或 transform 撑出总滚动高度。

```
总高度 = 总条数 × 行高（撑出滚动条）
渲染的 = 可视区能放下的条数 + buffer
滚动时 = 根据 scrollTop 算出应该渲染哪几条
```

**难点**：

- **不定高**——需要动态测量并缓存高度
- **二维虚拟滚动**（横向也要虚拟化）——
  例如日历/表格既有行虚拟化，又有列虚拟化，还要处理冻结行列与键盘可访问性

---

## 动画性能

- **优先动 `transform` 和 `opacity`**——
  在合适的分层条件下可以只做合成，通常能避免 layout；
  是否产生 paint/新合成层仍取决于具体内容和浏览器
- 改 `width`/`top`/`left` 会触发**重排（reflow）**，代价最大
- `will-change` 提前提升为合成层，但**别滥用**——
  每个合成层都占显存

> 重排重绘的详细机制见
> [04-浏览器与网络/重排和重绘.md](../04-浏览器与网络/重排和重绘.md)
