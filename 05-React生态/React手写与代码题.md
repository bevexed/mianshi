# React 手写与代码题

> JS 通用手写题见 [01-JavaScript/手写题/](../01-JavaScript/手写题/)

## 闭包陷阱（最高频的看代码题）

```js
function Counter() {
	const [count, setCount] = useState(0);

	useEffect(() => {
		const t = setInterval(() => console.log(count), 1000);
		return () => clearInterval(t);
	}, []); // ← 空依赖

	return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**问：点击几次后，控制台打印什么？**
**答：永远打印 0。**

**原因**：effect 只执行一次，
里面的闭包捕获的是**首次渲染时的 count**（值为 0）。
后续渲染产生了新的 count，但定时器里的闭包还指向旧的。

**三种修法**：

```js
// 1. 加依赖（每次 count 变化重建定时器）
useEffect(() => { ... }, [count])

// 2. 用 ref 存最新值
const countRef = useRef(count)
countRef.current = count
useEffect(() => {
  const t = setInterval(() => console.log(countRef.current), 1000)
  return () => clearInterval(t)
}, [])

// 3. 如果是要更新 state，用函数式更新
setCount(c => c + 1)
```

---

## 实现 usePrevious

```js
function usePrevious(value) {
	const ref = useRef();
	useEffect(() => {
		ref.current = value;
	}, [value]);
	return ref.current; // 返回的是上一次渲染的值
}
```

**关键点**：`useEffect` 在渲染后执行，
所以 return 的时候 `ref.current` 还是旧值。

---

## 实现 useDebounce / useThrottle

```js
function useDebounce(value, delay = 300) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(t); // 关键：清理上一个定时器
	}, [value, delay]);
	return debounced;
}

// 防抖函数版（注意要稳定引用）
function useDebounceFn(fn, delay = 300) {
	const fnRef = useRef(fn);
	fnRef.current = fn; // 始终最新，避免闭包陷阱
	const timer = useRef();

	useEffect(() => () => clearTimeout(timer.current), []);

	return useCallback(
		(...args) => {
			clearTimeout(timer.current);
			timer.current = setTimeout(() => fnRef.current(...args), delay);
		},
		[delay]
	);
}
```

---

## 实现一个简化版 useState

**考对闭包和链表的理解：**

```js
let hooks = [];
let cursor = 0;

function useState(initial) {
	const i = cursor;
	if (!(i in hooks)) {
		hooks[i] = typeof initial === 'function' ? initial() : initial;
	}
	const setState = (v) => {
		hooks[i] = typeof v === 'function' ? v(hooks[i]) : v;
		cursor = 0; // 重置游标
		render(); // 触发重渲染
	};
	cursor++;
	return [hooks[i], setState];
}
```

这个教学实现不包含批处理、优先级、多组件隔离等真实机制。
**它能解释「为什么 Hooks 不能写在 if 里」**——
`cursor` 是按调用顺序递增的，少调一次全部错位。

---

## 实现 useRequest（简化版）

```js
function useRequest(fn, deps = []) {
	const [state, setState] = useState({ loading: true, data: null, error: null });

	useEffect(() => {
		let cancelled = false; // 关键：处理竞态
		setState((s) => ({ ...s, loading: true }));

		fn().then(
			(data) => !cancelled && setState({ loading: false, data, error: null }),
			(error) => !cancelled && setState({ loading: false, data: null, error })
		);

		return () => {
			cancelled = true;
		};
	}, deps);

	return state;
}
```

**面试时要主动说**：

> 这个实现处理了竞态，但没有缓存、重试、去重、后台刷新。
> 生产环境我会直接用 react-query，
> 自己写这些等于重新实现一遍且必然有遗漏。

---

## 其他可能遇到的

1. **实现 ErrorBoundary**（只能用 class：`getDerivedStateFromError` + `componentDidCatch`）
2. **受控 / 非受控组件的区别**，以及怎么写一个同时支持两者的组件
3. **实现一个简单的 Context + useReducer 状态管理**
4. **列表虚拟滚动的核心思路**（只渲染可视区 + 上下 buffer，
   用 padding/transform 撑出滚动高度）
