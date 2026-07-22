# React 与 Vue 的区别

## 不要只背 API

React 和 Vue 都能完成中大型前端应用。选型应比较编程模型、
团队经验、生态与存量资产，不应简化成“谁性能更好”。

| 维度       | React                                                         | Vue 3                                                  |
| ---------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| 核心定位   | 用于构建 UI 的库，路由和数据层通常由框架/生态补齐             | 渐进式框架，官方提供 Router、Pinia 等协同方案          |
| UI 表达    | JSX：JavaScript 内组合标记和逻辑                              | SFC 模板为主，也支持 JSX/渲染函数                      |
| 响应式模型 | state 是渲染快照，调度更新后重新调用组件                      | `ref`/`reactive` 通过代理跟踪依赖，精确触发相关 effect |
| 优化方式   | 组件边界、状态位置、`memo`、transition，可配合 React Compiler | 模板编译器生成 Patch Flag、静态提升和 Block Tree       |
| 逻辑复用   | 自定义 Hooks                                                  | Composables（Composition API）                         |
| 学习曲线   | JavaScript/JSX 抽象空间大，选择也多                           | 模板约定和官方生态较完整，上手路径更集中               |

## 响应式心智模型

### React：更新状态快照

```jsx
setCount(count + 1);
// 当次事件回调中的 count 仍是该次渲染的快照
```

React 不要求应用数据本身都是 Proxy。组件调用 setter/dispatch 后，
React 调度一次新渲染，再调和并提交差异。

### Vue：跟踪属性读写

```js
const count = ref(0);
count.value++;
```

Vue 在 effect 运行时记录读取了哪些响应式属性，属性变化后只通知相关 effect。
这不表示 Vue 没有 Virtual DOM，也不表示 React 每次都重建真实 DOM。

## 组件通信对照

| 需求             | React                     | Vue 3                |
| ---------------- | ------------------------- | -------------------- |
| 父传子           | props                     | props                |
| 子通知父         | 回调 prop                 | `emit`               |
| 内容组合         | `children` / render props | slots                |
| 跨层依赖         | Context                   | `provide` / `inject` |
| 本地状态逻辑复用 | custom Hook               | composable           |

## 双方都会遇到的问题

- 列表需要稳定、有语义的 key，不要在可重排列表中使用 index。
- 派生数据应尽量计算而不是再存一份，否则容易出现不一致。
- 订阅、定时器、网络请求和第三方实例都要对称清理。
- 大列表、高频更新和不合理的全局状态都会带来性能问题，
  需要用 Profiler/DevTools 先定位。

## 怎么选

- 已有团队能力、组件库和运维经验通常比微基准更重要。
- 需要 React Native、React Server Components 或特定 React 生态时，React 更自然。
- 希望用 SFC、官方 Router/Pinia 和编译期模板优化形成一致路径时，Vue 更自然。
- 存量项目不应仅因为框架偏好重写；先量化现有瓶颈、迁移成本和收益。
