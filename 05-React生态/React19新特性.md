# React 19 新特性

## 主要变化

| 特性                            | 说明                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Actions**                     | `useActionState` / `useFormStatus` / `useOptimistic`，把表单提交的 pending、错误、乐观更新标准化 |
| **`use` API**                   | 可以在渲染中读 Promise 和 Context，且**可以写在条件里**（它不是 Hook）                           |
| **Server Components 正式化**    | RSC 从实验特性变为稳定                                                                           |
| **ref 作为 prop**               | 函数组件可直接接收 `ref` prop，`forwardRef` 不再必需                                             |
| **文档元数据**                  | 组件里直接写 `<title>` / `<meta>` / `<link>` 会被自动提升到 `<head>`                             |
| **资源预加载 API**              | `preload` / `preinit` / `prefetchDNS` / `preconnect`                                             |
| **ref 清理函数**                | ref 回调可以返回清理函数，类似 useEffect                                                         |
| **`<Context>` 直接当 Provider** | 不用写 `<Context.Provider>` 了                                                                   |

> **自动批处理**是 React 18 的特性，不是 19 的——别答错。

---

## Actions 怎么用

```jsx
function Form() {
	const [state, submitAction, isPending] = useActionState(async (prevState, formData) => {
		const res = await submit(formData);
		return res.error ? { error: res.error } : { success: true };
	}, null);

	return (
		<form action={submitAction}>
			<input name="title" />
			<button disabled={isPending}>提交</button>
			{state?.error && <p>{state.error}</p>}
		</form>
	);
}
```

**价值**：以前每个表单都要手写 `loading` / `error` / `disabled` 三个 state，
现在标准化了。

### useOptimistic

```jsx
const [optimisticList, addOptimistic] = useOptimistic(list, (state, newItem) => [
	...state,
	newItem
]);
// 提交时立刻把新项加进去展示，失败自动回滚到真实 list
```

---

## `use` API

```jsx
function Comments({ promise }) {
  const comments = use(promise)   // 配合 Suspense，读 Promise
  return comments.map(...)
}

function Theme() {
  const theme = use(ThemeContext)  // 也能读 Context
  if (cond) { const x = use(OtherContext) }  // ✅ 可以写在条件里
}
```

**为什么它能写在条件里**：`use` 不是 Hook，
不依赖调用顺序对应的 hooks 链表。

---

## 一句话总结（加分）

> React 19 把 Action 的 pending/错误状态、乐观更新和资源读取
> 纳入更一致的 React 协调模型。
>
> 但要注意，收进框架不等于取代——
> `useActionState` 不是完整的表单校验库，
> `use` 本身也不提供 TanStack Query 那样的缓存、重试和失效管理。

常见追问是“React 19 之后还需要 TanStack Query 吗”，
回答重点是两者处理的层次不同。

---

## 升级要注意什么

- **移除了旧 API**：`propTypes`、`defaultProps`（函数组件）、
  string refs、legacy Context
- **`ReactDOM.render` 已删除**，必须用 `createRoot`
- **`react-test-renderer` 废弃**
- 第三方库的兼容性是主要风险，尤其 UI 库
