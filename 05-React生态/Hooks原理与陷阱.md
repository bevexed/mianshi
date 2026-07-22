# Hooks 原理与陷阱

> 原 `useEffect顺序.md` 已并入本篇。

## 为什么 Hooks 不能写在 if / 循环里

**根因：React 靠「调用顺序」而不是「名字」来对应 Hook 的状态。**

每个函数组件对应一个 fiber 节点，节点上挂着一条 **hooks 链表**。
首次渲染时按调用顺序依次创建节点；更新时按同样的顺序依次读取。
如果某次渲染因为 if 少调用了一个 Hook，
后面所有 Hook 的对应关系全部错位——
`useState` 拿到的可能是上一个 `useEffect` 的内容。

```js
// ❌ 第二次渲染 cond 为 false 时，count 会读到 name 的槽位
if (cond) {
	const [count] = useState(0);
}
const [name] = useState('');
```

**衍生问**：那怎么实现条件逻辑？
→ Hook 照常调用，把条件放进 Hook 内部
（`useEffect(() => { if (cond) ... })`），或者把条件分支拆成两个组件。

---

## useEffect 为什么会无限循环

**三种典型成因，要能分类而不是只说一种：**

**1. effect 里 setState，而这个 state 又在依赖数组里**

```js
useEffect(() => {
	setCount(count + 1);
}, [count]); // 死循环
```

**2. 依赖数组里放了每次渲染都新建的引用**——对象、数组、内联函数

```js
useEffect(() => {...}, [{ id }])            // 每次都是新对象
useEffect(() => {...}, [list.filter(...)])  // 每次都是新数组
```

**3. 依赖了一个由 effect 自己间接改变的值**（链条绕一圈回来）

### 排查手段

- 把依赖项逐个打印出来对比引用
- 用 `useRef` 存上一次的依赖做 diff
- React DevTools Profiler 看谁触发了重渲染

### 修法

`useMemo`/`useCallback` 稳定引用、
函数式更新 `setCount(c => c + 1)` 去掉依赖、
把不需要触发重渲染的值放 `useRef`。

**但最该先问的是：这个 effect 本来是不是就不该存在？**

---

## 什么时候不该用 useEffect

**这题现在问得越来越多，能答上来很加分。**
官方文档专门写过《You Might Not Need an Effect》。

| 场景                             | 该怎么做                                 |
| -------------------------------- | ---------------------------------------- |
| 由 props/state 计算出的值        | **直接在渲染时算**，别 effect + setState |
| 用户事件触发的逻辑（提交、埋点） | 放**事件处理函数**里，不是 effect        |
| props 变化时重置 state           | 用 `key` 让组件重新挂载                  |
| 请求数据                         | 用 react-query / SWR / RSC               |

> **Effect 的正当用途只有一个：与 React 之外的系统同步**——
> 订阅、DOM 操作、定时器、第三方库实例。

---

## 为什么不用 useEffect 请求数据

**必答清楚，这是 react-query 存在的理由：**

- **竞态（race condition）**——快速切换参数时，
  先发的请求可能后回来，用旧数据覆盖新数据。
  自己写要处理 cleanup 里的 ignore 标志
- **没有缓存**——组件重挂载就重新请求
- **瀑布流**——父组件 effect 请求完才轮到子组件，串行加载
- **没有重试、失效、后台刷新、去重**
- **Strict Mode 开发环境会额外执行一次设置和清理**，
  用来暴露清理不完整；请求层仍要正确处理取消与竞态

自己实现一遍这些等于写一个残缺版 react-query。

> 详见 [状态管理/react-query.md](状态管理/react-query.md)

---

## useEffect 的执行时机

**useLayoutEffect 和 useEffect 的区别**：

- `useLayoutEffect` 在 **DOM 变更后、浏览器绘制前**同步执行，
  会**阻塞绘制**
- `useEffect` 通常在浏览器绘制后执行，但交互触发的更新、
  layout effect 中的同步更新等情况会改变时机
- **什么时候必须用 layout**：需要读取 DOM 布局并同步修改
  （比如测量元素后调整位置），否则用 effect 会看到闪烁
- **代价**：阻塞绘制，滥用会拖慢首屏；且 SSR 时会警告
  （服务端没有 layout 阶段）

不要依赖父子 Effect 或 `requestAnimationFrame` 与 Effect 的绝对先后作为业务协议；
需要顺序时，在同一个 Effect 中显式组织。

---

## useMemo 和 useCallback

- `useMemo(fn, deps)` 缓存 **fn 的返回值**
- `useCallback(fn, deps)` 缓存 **fn 本身**，
  等价于 `useMemo(() => fn, deps)`

**面试官真正想听的是「什么时候不该用」**：

- 它们本身有成本（存储 + 每次比较依赖），包一个 `a + b` 是负优化
- 只在两种情况下值得用：
  ① 计算确实昂贵
  ② 需要**稳定引用**给 `React.memo` 的子组件或 Hook 依赖数组
- **React Compiler 可以自动处理许多组件与值的记忆化**，
  但它是需要接入和验证的编译工具，不是安装 React 19 后必然自动生效

---

## useRef 为什么不触发重新渲染

- `useRef` 返回的是一个**在组件整个生命周期内保持不变的对象** `{ current: x }`
- 改的是这个对象的属性，**React 不知道也不关心**——
  没有调用 setState，就不会产生更新调度
- 用途：① 存 DOM 引用 ② 存不参与渲染的可变值
  （定时器 id、上一次的值、防止重复执行的标志）

**衍生问**：`useRef` 和 `useState` 存值的区别？
→ state 变了会重渲染，且渲染期间读到的是**快照**；
ref 变了不重渲染；事件或 Effect 在之后读取 `.current` 时能拿到当时的值。
渲染期间不应随意读写 ref，否则会破坏渲染的可预测性。

---

## 怎么设计一个自定义 Hook

**原则**：

- 优先封装可复用的状态逻辑和外部系统同步，UI 组合交给组件
- **命名以 `use` 开头**，让 lint 规则和 React 识别其中的 Hook 调用
- 返回数组还是对象由 API 语义决定，不存在“三个值必须返回对象”的规则
- **明确参数的稳定性要求**——如果参数是对象/函数，
  内部用它做依赖会引发无限循环，要么要求调用方保证稳定，
  要么内部用 ref 存

面试时可以选 `useRequest`、`usePagination` 或 `useCountdown` 中的一个，
讲清输入、返回值、取消/清理和竞态处理。
