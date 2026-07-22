# Pinia 与 Vuex

## 先说结论

- Vue 3 新项目的官方推荐状态库是 **Pinia**。
- Vuex 3/4 仍常见于存量 Vue 2/3 项目，维护时不需为追新立即重写。
- 远程 API 数据不应不加区分地全都放入全局 store；
  还要评估请求缓存、路由数据层与局部状态。

## Vuex 核心流程

```text
Component --dispatch--> Action --commit--> Mutation --> State
     ^                                             |
     +---------------- getters/render ------------+
```

- `state`：单一状态树。
- `getters`：派生状态。
- `mutations`：同步变更，方便 DevTools 记录前后快照。
- `actions`：可异步，完成流程后 commit mutation。
- `modules`：拆分大型 store，常配合 namespace。

“mutation 只能同步”是 Vuex 的约束与调试模型，
不是 JavaScript 技术上无法在 mutation 中启动异步操作。

## Pinia 简化了什么

```ts
export const useCartStore = defineStore('cart', () => {
	const items = ref<CartItem[]>([]);
	const total = computed(() => items.value.reduce((sum, item) => sum + item.price, 0));

	async function load() {
		items.value = await fetchCart();
	}

	return { items, total, load };
});
```

- 取消 mutation 层，action 可以同步或异步地更新状态。
- 提供 Options Store 和 Setup Store 两种写法。
- 通过 store 函数直接导入，TypeScript 推断与自动补全更自然。
- store 是扁平定义的，可通过组合其他 store 建立领域关系。

## 常见陷阱

### 解构丢失响应性

```ts
const store = useCartStore();
const { items, total } = storeToRefs(store); // state/getter 用 storeToRefs
const { load } = store; // action 可直接解构
```

### SSR 跨请求泄漏

服务端不能在多用户请求之间共享带用户数据的 store。
应由 SSR 框架为每个请求创建 Pinia 实例，并安全地序列化/水合状态。

### 持久化边界

Pinia/Vuex 本身不意味着已安全持久化。只持久化确实需要跨会话保留的非敏感字段，
设计 schema 版本和迁移，不要把 token 或完整 store 无差别写入 localStorage。

## 选型

| 场景                     | 起点方案                        |
| ------------------------ | ------------------------------- |
| 单组件或少量父子共享     | `ref` / `reactive` + props/emit |
| 跨层低频依赖             | `provide` / `inject`            |
| 跨页共享的客户端业务状态 | Pinia                           |
| 存量 Vuex 项目           | 先维持稳定，再按收益分模块迁移  |
