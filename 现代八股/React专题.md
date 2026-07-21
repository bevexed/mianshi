# React 专题（Hooks / 渲染机制 / 并发特性）

> 面试占比最高的一块，深圳中高级前端基本 40% 时间在这。
> 仓库原有的 `JS框架/react/` 只有 4 篇（其中 fiber.md 2 行、useEffect顺序.md 4 行），
> 这篇是重写。

---

## 一、Hooks

### Q1：为什么 Hooks 不能写在 if / 循环里？

**根因：React 靠「调用顺序」而不是「名字」来对应 Hook 的状态。**

每个函数组件对应一个 fiber 节点，节点上挂着一条 **hooks 链表**。
首次渲染时按调用顺序依次创建节点；更新时按同样的顺序依次读取。
如果某次渲染因为 if 少调用了一个 Hook，后面所有 Hook 的对应关系全部错位——
`useState` 拿到的可能是上一个 `useEffect` 的内容。

```js
// ❌ 第二次渲染 cond 为 false 时，count 会读到 name 的槽位
if (cond) { const [count] = useState(0) }
const [name] = useState('')
```

**衍生问**：那怎么实现条件逻辑？
→ Hook 照常调用，把条件放进 Hook 内部（`useEffect(() => { if (cond) ... })`），
或者把条件分支拆成两个组件。

### Q2：useEffect 为什么会无限循环？

**三种典型成因，要能分类而不是只说一种：**

1. **effect 里 setState，而这个 state 又在依赖数组里**
   ```js
   useEffect(() => { setCount(count + 1) }, [count])  // 死循环
   ```
2. **依赖数组里放了每次渲染都新建的引用**——对象、数组、内联函数
   ```js
   useEffect(() => {...}, [{ id }])        // 每次都是新对象
   useEffect(() => {...}, [list.filter(...)])  // 每次都是新数组
   ```
3. **依赖了一个由 effect 自己间接改变的值**（链条绕一圈回来）

**排查手段**：把依赖项逐个打印出来对比引用；用 `useRef` 存上一次的依赖做 diff；
React DevTools Profiler 看谁触发了重渲染。

**修法**：`useMemo`/`useCallback` 稳定引用、函数式更新 `setCount(c => c + 1)`
去掉依赖、把不需要触发重渲染的值放 `useRef`。
**但最该先问的是：这个 effect 本来是不是就不该存在？**（见 Q4）

### Q3：useMemo 和 useCallback 的区别？

- `useMemo(fn, deps)` 缓存 **fn 的返回值**
- `useCallback(fn, deps)` 缓存 **fn 本身**，等价于 `useMemo(() => fn, deps)`

**面试官真正想听的是「什么时候不该用」**：
- 它们本身有成本（存储 + 每次比较依赖），包一个 `a + b` 是负优化
- 只在两种情况下值得用：① 计算确实昂贵 ② 需要稳定引用给
  `React.memo` 的子组件或 Hook 依赖数组
- **React 19 的 React Compiler 会自动做这件事**，手写会越来越少

### Q4：什么时候不该用 useEffect？

**这题现在问得越来越多，能答上来很加分。官方文档专门写过《You Might Not Need an Effect》。**

| 场景 | 该怎么做 |
|---|---|
| 由 props/state 计算出的值 | **直接在渲染时算**，别 effect + setState |
| 用户事件触发的逻辑（提交、埋点） | 放**事件处理函数**里，不是 effect |
| props 变化时重置 state | 用 `key` 让组件重新挂载 |
| 请求数据 | 用 react-query / SWR / RSC（见 Q5） |

**Effect 的正当用途只有一个：与 React 之外的系统同步**——
订阅、DOM 操作、定时器、第三方库实例。

### Q5：为什么不用 useEffect 请求数据？

**必答清楚，这是 react-query 存在的理由：**
- **竞态（race condition）**——快速切换参数时，先发的请求可能后回来，
  用旧数据覆盖新数据。自己写要处理 cleanup 里的 ignore 标志
- **没有缓存**——组件重挂载就重新请求
- **瀑布流**——父组件 effect 请求完才轮到子组件，串行加载
- **没有重试、失效、后台刷新、去重**
- **StrictMode 下开发环境会执行两次**，暴露上面所有问题

自己实现一遍这些等于写一个残缺版 react-query。

### Q6：useRef 为什么不触发重新渲染？

- `useRef` 返回的是一个**在组件整个生命周期内保持不变的对象** `{ current: x }`
- 改的是这个对象的属性，**React 不知道也不关心**——没有调用 setState，
  就不会产生更新调度
- 用途：① 存 DOM 引用 ② 存不参与渲染的可变值（定时器 id、上一次的值、
  防止重复执行的标志）

**衍生问**：`useRef` 和 `useState` 存值的区别？
→ state 变了会重渲染且渲染期间值是快照；ref 变了不重渲染且读到的永远是最新值。

### Q7：怎么设计一个自定义 Hook？

**原则**：
- **只封装逻辑，不封装 UI**——返回数据和方法，不返回 JSX
- **命名以 `use` 开头**（不只是约定，lint 规则和编译器依赖它）
- **返回值的形态**：1-2 个返回数组（可自由命名），3 个以上返回对象
- **接收参数要稳定**——如果参数是对象/函数，内部用它做依赖会引发 Q2 的问题，
  要么要求调用方保证稳定，要么内部用 ref 存

【需确认】你项目里封装过哪些 hooks？简历 Housekeeping/Booking Engine 都写了
「常用 hooks 封装」，**准备一个具体例子**（比如 `useRequest`、`usePagination`、
`useCountdown`），能讲清为什么这么设计。

---

## 二、渲染机制

### Q8：组件为什么会重新渲染？

只有三个原因：
1. **自身 state 变化**（setState / useReducer dispatch）
2. **父组件重新渲染**（默认级联，与 props 是否变化无关）
3. **订阅的 Context value 变化**

### Q9：父组件 render，子组件一定 render 吗？

**不一定，有两个例外：**
1. 子组件被 `React.memo` 包裹且 props 浅比较相等
2. **子组件是通过 `children` / props 传进来的 element**——
   因为这个 element 是在父组件的父组件里创建的，父组件重渲染时它的引用没变

```jsx
// Wrapper 重渲染时，Heavy 不会重渲染（element 引用没变）
<Wrapper><Heavy /></Wrapper>
```

**第 2 点很多人不知道，是「不用 memo 也能优化」的关键技巧**，
和 Next.js 里 Server Component 通过 children 传给 Client Component 是同一个原理
（见 [Next.js 篇](../简历深挖/产业互联网平台官网-NextJS.md) Q2）。

### Q10：React.memo 的原理？为什么有时候没效果？

- 原理：对 props 做**浅比较**，相等就复用上次的渲染结果
- **失效的常见原因**：
  - props 里有每次都新建的对象/数组/内联函数 → 浅比较必然不等
  - props 里有 `children`（JSX 每次都是新对象）
  - 组件内部订阅了 Context，Context 变了照样重渲染（memo 管不了）
- 第二个参数可以自定义比较函数，但**深比较的成本可能超过重渲染本身**

### Q11：key 为什么不能用 index？

- key 的作用是让 diff 时能识别「这是同一个节点」
- 用 index 时，**列表增删或排序后，同一个 index 对应的数据变了**，
  React 会认为节点没变而只更新内容 → 导致：
  - 组件内部 state 错位（比如输入框的值跟错了行）
  - 非受控组件的 DOM 状态残留
  - 动画/焦点错乱
- **什么时候可以用 index**：列表纯静态、不排序不增删、且项内无状态

### Q12：Fiber 是什么？解决了什么问题？

（仓库原来的 `fiber.md` 只有 2 行，这里补上）

**问题**：React 15 的递归 diff 是**不可中断的同步过程**，
组件树大时会长时间占用主线程，导致掉帧、输入卡顿。

**Fiber 的做法**：
1. 把虚拟 DOM 树变成**链表结构**（child / sibling / return 三个指针），
   递归改成循环，从而**可以中断和恢复**
2. 渲染分两个阶段：
   - **render / reconcile 阶段**：计算变更，**可中断、可丢弃**，无副作用
   - **commit 阶段**：应用到 DOM，**同步不可中断**
3. 配合调度器给更新分优先级，高优先级（用户输入）可以插队

**衍生问**：为什么 render 阶段的函数要求"纯"？
→ 因为它可能被中断后重新执行，有副作用就会执行多次。
**这也是 StrictMode 故意双调用的原因——帮你暴露不纯的代码。**

---

## 三、并发特性与新版本

### Q13：Concurrent Rendering 是什么？

**不是一个 API，是一种能力**：React 可以**同时准备多个版本的 UI**，
渲染过程可被打断、暂停、恢复、放弃。

带来的具体特性：
- `useTransition` / `startTransition`——把更新标记为**非紧急**，
  让紧急更新（输入）优先
- `useDeferredValue`——延迟某个值的更新，典型场景是输入框实时搜索时
  保持输入流畅
- `Suspense` 的流式渲染

### Q14：useTransition 和防抖有什么区别？

**很好的对比题：**
- **防抖**是「延迟触发」——在延迟期间**什么都不做**，固定等待时间
- **useTransition** 是「立刻开始渲染，但可被打断」——
  没有固定延迟，如果 CPU 空闲马上就完成了；有新的紧急更新才会被打断重来
- 结论：防抖控制**触发频率**（适合减少网络请求），
  transition 控制**渲染优先级**（适合大量 DOM 更新）

### Q15：React 19 有哪些变化？

**面试高频，挑重点说：**

| 特性 | 说明 |
|---|---|
| **Actions** | `useActionState` / `useFormStatus` / `useOptimistic`，把表单提交的 pending、错误、乐观更新标准化 |
| **`use` API** | 可以在渲染中读 Promise 和 Context，且**可以写在条件里**（它不是 Hook） |
| **Server Components 正式化** | RSC 从实验特性变为稳定 |
| **ref 作为 prop** | 函数组件可直接接收 `ref` prop，`forwardRef` 不再必需 |
| **自动批处理已在 18 完成** | 18 起 Promise/setTimeout/原生事件里的多次 setState 也会合并 |
| **React Compiler** | 自动做记忆化，逐步替代手写 `useMemo`/`useCallback`（独立于 19 发布，但配套） |
| **文档元数据** | 组件里直接写 `<title>` / `<meta>` 会被提升到 head |

**加分**：能说一句「19 的主线是**把之前需要靠库解决的问题收进框架**——
表单状态、乐观更新、数据获取」。

### Q16：Suspense 的原理？

- 子组件在渲染中「抛出一个 Promise」，React 捕获后展示 `fallback`，
  Promise resolve 后重新渲染
- 配合 RSC 可以做**流式 SSR**：服务端先把外壳发给浏览器，
  慢的部分后续以 chunk 形式补上，不用等全部数据就绪
- 传统 `useEffect` 请求**用不了** Suspense，需要支持 Suspense 的数据层
  （react-query 的 `useSuspenseQuery`、RSC、`use`）

---

## 四、可能的手写题

深圳面试常见的手写/看代码题：

1. **实现 useDebounce / useThrottle hook**
2. **实现 usePrevious**（`useRef` + `useEffect`）
3. **说出下面代码打印什么**（闭包陷阱）
   ```js
   const [count, setCount] = useState(0)
   useEffect(() => {
     const t = setInterval(() => console.log(count), 1000)  // 永远打印 0
     return () => clearInterval(t)
   }, [])
   ```
   → 因为 effect 只执行一次，闭包捕获的是首次渲染的 count。
   修法：依赖里加 count，或用 `useRef` 存最新值，或函数式更新
4. **实现一个简单的 useState**（考对闭包和链表的理解）
