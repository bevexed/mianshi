# 组件生命周期与 Effect

## 函数组件的三个阶段

1. **Render**：React 调用组件计算下一版 UI。这个阶段必须保持纯函数，
   在并发渲染中可能被暂停、放弃或重新执行。
2. **Commit**：React 将变更提交到 DOM。
   `useLayoutEffect` 的设置函数在 DOM 提交后同步执行，会阻塞绘制。
3. **Effect**：`useEffect` 用来把组件与外部系统同步。
   它通常在浏览器绘制后运行，但 React 也可能在特定交互或布局更新前提前处理，
   不应依赖它和 `requestAnimationFrame` 的绝对顺序。

## Effect 的设置与清理

```jsx
useEffect(() => {
	const controller = new AbortController();
	const unsubscribe = subscribe(id, controller.signal);

	return () => {
		controller.abort();
		unsubscribe();
	};
}, [id]);
```

- 首次提交后：执行设置函数。
- 依赖变化：先用旧依赖执行清理，再用新依赖执行设置。
- 卸载：执行最后一次清理。
- Strict Mode 开发环境会额外执行一次“设置 → 清理 → 设置”，
  用于暴露不对称的清理逻辑；这不是生产环境的常规流程。

### 场景追问：useEffect 定时器为什么只从零增加到一？

**面试官：** 空依赖 Effect 的 interval 每秒执行 `setCount(count + 1)`，为什么不持续增长？清理函数何时执行？

**口语参考答案：**

> 定时器回调捕获了第一次渲染时 count 为零的闭包，而空依赖不会因 count 改变而重新创建回调，所以每次都在设置一。这里我会用函数式更新 setCount(prev => prev + 1)，直接基于更新队列中的前一状态计算。把 count 加进依赖也能解决旧值，但会随每次变化重建定时器。清理函数在依赖改变、下一次 Effect setup 前，以及卸载时执行，用于释放定时器、订阅和其他资源。

```tsx
useEffect(() => {
	const timer = setInterval(() => setCount((prev) => prev + 1), 1000);
	return () => clearInterval(timer);
}, []);
```

**追问与易错点：** 示例假设已导入 Hook 并声明 state。开发环境 StrictMode 可能额外执行 setup、cleanup、setup，用于检查清理是否对称。

## 不要用 Effect 代替数据流

| 需求                         | 更合适的做法                                    |
| ---------------------------- | ----------------------------------------------- |
| 根据 props/state 计算值      | 渲染时直接计算，必要时用 `useMemo`              |
| 处理点击、提交               | 事件处理函数                                    |
| props 变化时整体重置局部状态 | 为子树设置有语义的 `key`                        |
| 客户端服务端数据             | 路由/框架数据层或 TanStack Query 等带缓存的方案 |
| 订阅、定时器、DOM、网络连接  | `useEffect`，并提供对称清理                     |

## 类组件如何对照

| 目的               | 类组件                                           | 函数组件                      |
| ------------------ | ------------------------------------------------ | ----------------------------- |
| 挂载后同步外部系统 | `componentDidMount`                              | `useEffect`                   |
| 更新后同步         | `componentDidUpdate`                             | 带依赖的 `useEffect`          |
| 清理               | `componentWillUnmount`                           | Effect 返回的函数             |
| 提交前读 DOM 快照  | `getSnapshotBeforeUpdate`                        | 没有完全等价 Hook，需重新设计 |
| 错误边界           | `getDerivedStateFromError` / `componentDidCatch` | 使用类错误边界或框架能力      |

`UNSAFE_componentWillMount`、`UNSAFE_componentWillReceiveProps` 和
`UNSAFE_componentWillUpdate` 可能在提交前被多次调用，
新代码不应继续使用。

## 高频追问

- **`useLayoutEffect` 何时必要**：必须在绘制前测量并同步调整 DOM 时。
- **为什么清理不只在卸载时跑**：依赖变化后，旧订阅也必须先停止。
- **怎样避免请求竞态**：路由数据层优先；手写时用 `AbortController`
  或在清理函数中标记当次结果失效。
