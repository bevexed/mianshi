# react-query（TanStack Query）

> 前置：[服务端状态与客户端状态.md](服务端状态与客户端状态.md)

## staleTime 和 gcTime 的区别（最高频）

- **staleTime**：数据多久后被标记为「陈旧」。
  **未过期时，组件重新挂载不会重新请求**
- **gcTime**（旧名 cacheTime，默认 5 分钟）：
  数据**没有任何组件在用之后**，多久从缓存中被回收

**关系**：staleTime 决定**要不要重新请求**，gcTime 决定**缓存留多久**。

### 最容易被问倒的点

默认 `staleTime: 0`，意味着数据一拿到就是 stale 的，
组件重新挂载、窗口重新聚焦或网络重连时，
陈旧且满足对应选项的活跃查询可能在后台重新请求。

很多人以为"用了 react-query 就有缓存了"，
其实默认行为是 **先展示缓存、同时后台刷新**（stale-while-revalidate）——
用户看到的是旧数据，然后无感知地被更新。

---

## 缓存什么时候失效

三种途径：

1. **时间**——超过 staleTime 自动变 stale
2. **重新获取触发条件**——`refetchOnMount` / `refetchOnWindowFocus` /
   `refetchOnReconnect`；默认行为通常还会结合查询是否 stale
3. **手动**——`queryClient.invalidateQueries({ queryKey })`，
   典型场景是 mutation 成功后让相关列表失效

---

## queryKey 怎么设计

**这题能看出是不是真用过。**

- **queryKey 是查询缓存的身份标识，也承担声明数据依赖的作用**——
  key 里的任何值变化都会触发重新请求，这是它的核心机制
- **必须把所有影响结果的参数放进 key**：
  ```js
  useQuery({ queryKey: ['orders', { page, status, keyword }], ... })
  ```
  漏了 page，翻页就不会重新请求

### 层级化设计便于批量失效

```
['orders']                        ← 所有订单相关
['orders', 'list', filters]       ← 列表
['orders', 'detail', id]          ← 详情
```

这样 `invalidateQueries({ queryKey: ['orders'] })`
能一次失效所有订单相关缓存。

### query key factory

大项目建议集中定义 key 的工厂函数，避免各处手写字符串拼错：

```js
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (f) => [...orderKeys.lists(), f] as const,
  detail: (id) => [...orderKeys.all, 'detail', id] as const,
}
```

---

## prefetch

- `queryClient.prefetchQuery()` 提前把数据放进缓存，
  等用户真正进入页面时直接命中
- **典型场景**：hover 列表项时预取详情、
  翻页时预取下一页、SSR 时服务端预取

---

## SSR 怎么 Hydrate

```
服务端：
  const qc = new QueryClient()
  await qc.prefetchQuery({ queryKey, queryFn })
  const state = dehydrate(qc)              // 把缓存序列化

客户端：
  <HydrationBoundary state={state}>        // 把序列化的缓存注入
```

**要点**：

- **QueryClient 必须每个请求新建**——
  和 Zustand 一样的跨请求污染问题
- 客户端拿到 dehydrate 的数据后**不会立刻重新请求**（已在缓存里），
  但如果 staleTime 是 0，聚焦/挂载时仍会后台刷新 →
  **SSR 场景通常要设一个合理的 staleTime**，
  否则服务端渲染的意义被削弱

---

## mutation 之后怎么更新列表

三种策略，**要能说出取舍**：

| 策略                     | 做法                               | 取舍                         |
| ------------------------ | ---------------------------------- | ---------------------------- |
| **invalidate**（最常用） | 让缓存失效，重新请求               | 简单可靠，但多一次请求       |
| **setQueryData**         | 直接改缓存，无需请求               | 快，但要自己保证和服务端一致 |
| **乐观更新**             | `onMutate` 先改 UI，`onError` 回滚 | 体验最好，但要处理失败回滚   |

**答题加分**——说清什么时候用哪个：

> 点赞、收藏这种高频轻量操作用乐观更新；
> 订单提交这种重要操作用 invalidate，
> 宁可慢也要拿服务端的真实结果。

```js
useMutation({
	mutationFn: updateOrder,
	onMutate: async (newData) => {
		await queryClient.cancelQueries({ queryKey }); // 取消在途请求，防止覆盖
		const prev = queryClient.getQueryData(queryKey); // 存快照
		queryClient.setQueryData(queryKey, newData); // 乐观更新
		return { prev }; // 传给 onError
	},
	onError: (err, vars, ctx) => queryClient.setQueryData(queryKey, ctx.prev),
	onSettled: () => queryClient.invalidateQueries({ queryKey })
});
```

---

## 通用的状态分工示例

> 产品套餐、版本列表是服务端状态，用 TanStack Query 管理查询、缓存和失效。
>
> 用户当前选了哪个版本、选了多少年限、加购了哪些项——
> 这些是客户端交互状态；局部使用 `useState`/`useReducer`，
> 确实跨路由共享时再放入 Zustand 等 store。
>
> 价格是**算出来的**，两边都不存。
