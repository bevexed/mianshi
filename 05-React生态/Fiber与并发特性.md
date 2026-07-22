# Fiber 与并发特性

> 原 `fiber.md`（"解决了执行栈不能中断的问题"）已并入本篇并展开。

## Fiber 解决了什么问题

**问题**：React 15 的递归 diff 是**不可中断的同步过程**，
组件树大时会长时间占用主线程，导致掉帧、输入卡顿。

**Fiber 的做法**：

**1. 数据结构改造**——每个 Fiber 节点通过
（`child` / `sibling` / `return` 三个指针），
递归改成循环，从而**可以中断和恢复**。

```
      App
       │ child
       ▼
     Header ──sibling──► Main ──sibling──► Footer
       │ return ↑
```

**2. 渲染分两个阶段**：

| 阶段                   | 做什么                                  | 能否中断              | 有无副作用   |
| ---------------------- | --------------------------------------- | --------------------- | ------------ |
| **render / reconcile** | 计算变更，构建 fiber 树，打 effect 标记 | ✅ **可中断、可丢弃** | 无（必须纯） |
| **commit**             | 把变更应用到真实 DOM                    | ❌ 同步不可中断       | 有           |

**3. 优先级调度**——不同更新有不同优先级，
用户输入这类高优先级更新可以打断低优先级的渲染。

### 衍生问：为什么 render 阶段的函数要求"纯"

因为它**可能被中断后重新执行**，有副作用就会执行多次。

**这也是 StrictMode 故意双调用的原因**——
开发环境帮你暴露不纯的代码（比如在渲染中修改外部变量、发请求）。

---

## Concurrent Rendering 是什么

**不是一个 API，是一种能力**：React 可以**同时准备多个版本的 UI**，
渲染过程可被打断、暂停、恢复、放弃。

带来的具体特性：

- `useTransition` / `startTransition`——把更新标记为**非紧急**
- `useDeferredValue`——延迟某个值的更新
- `Suspense` 的流式渲染

---

## useTransition 和防抖有什么区别

**很好的对比题：**

- **防抖**是「延迟触发」——在延迟期间**什么都不做**，固定等待时间
- **useTransition** 是「立刻开始渲染，但可被打断」——
  没有固定延迟，如果 CPU 空闲马上就完成了；
  有新的紧急更新才会被打断重来

**结论**：
防抖控制**触发频率**（适合减少网络请求），
transition 控制**渲染优先级**（适合大量 DOM 更新）。

```jsx
const [isPending, startTransition] = useTransition();

// 输入立即响应（紧急）
setQuery(value);
// 列表渲染可以被打断（非紧急）
startTransition(() => setResults(filter(value)));
```

---

## useDeferredValue

```jsx
const deferredQuery = useDeferredValue(query);
const results = useMemo(() => search(deferredQuery), [deferredQuery]);
```

和 `useTransition` 的区别：

- `useTransition` 要你**能改触发更新的代码**
- `useDeferredValue` 用在**你只拿到值、改不了上游**的场景
  （比如值来自 props）

---

## Suspense 的原理

- 子组件在渲染中**抛出一个 Promise**，React 捕获后展示 `fallback`，
  Promise resolve 后重新渲染
- 配合 RSC 可以做**流式 SSR**：
  服务端先把外壳发给浏览器，慢的部分后续以 chunk 形式补上，
  不用等全部数据就绪
- **传统 `useEffect` 请求用不了 Suspense**，
  需要支持 Suspense 的数据层
  （react-query 的 `useSuspenseQuery`、RSC、React 19 的 `use`）

> 关联：[Next.js/渲染策略.md](Next.js/渲染策略.md)

---

## 批处理（Batching）

- **React 17 及以前**：只有 React 事件处理函数内部的 setState 会批处理，
  `setTimeout`、Promise、原生事件里的**不会**
- **React 18 使用 `createRoot` 后**：自动批处理扩展到定时器、Promise
  和原生事件等常见异步回调

```js
// React 17：渲染两次；React 18：渲染一次
setTimeout(() => {
	setCount((c) => c + 1);
	setFlag((f) => !f);
}, 0);
```

批处理不会无边界地跨越每一个异步阶段，React 也会在用户事件之间
保证 DOM 已更新。必须立即读取提交后 DOM 时才考虑 `flushSync`，
因为它会强制同步刷新并损失并发优化空间。
