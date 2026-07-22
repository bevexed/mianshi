# MVVM 与数据响应式实现

> 下面的代码只展示依赖收集的核心思路，省略了嵌套 effect 栈、依赖清理、代理缓存、数组与集合处理等生产级细节。Proxy 与 `defineProperty` 的对比见
> [01-JavaScript/Proxy 与 Reflect.md](../01-JavaScript/Proxy与Reflect.md)

## MVC / MVP / MVVM

| 模式     | 视图和数据的关系                           | 代表               |
| -------- | ------------------------------------------ | ------------------ |
| **MVC**  | View 直接读 Model，Controller 处理输入     | 后端框架、早期前端 |
| **MVP**  | View 和 Model 完全隔离，Presenter 双向转发 | Android 早期       |
| **MVVM** | **ViewModel 做双向绑定**，数据变视图自动变 | Vue、Angular、WPF  |

**MVVM 的核心价值**：
开发者**只操作数据，不操作 DOM**，
视图更新由框架自动完成。

> React 严格说不是 MVVM——它是单向数据流，
> 没有双向绑定，更接近 "UI = f(state)"。
> **这个区分经常被问。**

---

## 实现一个最小响应式系统

**三个角色**：

```
Observer   → 劫持数据，数据变了通知 Dep
Dep        → 依赖收集器，存着所有依赖这份数据的 Watcher
Watcher    → 订阅者，收到通知后执行更新（重新渲染/重新计算）
```

### 1. Dep（依赖收集）

```js
class Dep {
	constructor() {
		this.subs = new Set();
	}
	depend() {
		if (Dep.target) this.subs.add(Dep.target);
	}
	notify() {
		this.subs.forEach((w) => w.update());
	}
}
Dep.target = null; // 教学实现：当前正在计算的 Watcher
```

### 2. Observer（数据劫持）

**Vue2 的 defineProperty 版本**：

```js
function defineReactive(obj, key, val) {
	const dep = new Dep();
	observe(val); // 递归处理嵌套对象

	Object.defineProperty(obj, key, {
		get() {
			dep.depend(); // ⭐ 读取时收集依赖
			return val;
		},
		set(newVal) {
			if (newVal === val) return;
			val = newVal;
			observe(newVal);
			dep.notify(); // ⭐ 修改时通知更新
		}
	});
}

function observe(obj) {
	if (typeof obj !== 'object' || obj === null) return;
	Object.keys(obj).forEach((key) => defineReactive(obj, key, obj[key]));
}
```

**Vue3 的 Proxy 版本**：

```js
function reactive(target) {
	return new Proxy(target, {
		get(t, key, receiver) {
			track(t, key); // 收集依赖
			const res = Reflect.get(t, key, receiver);
			return typeof res === 'object' && res !== null
				? reactive(res) // ⭐ 惰性递归，用到才代理
				: res;
		},
		set(t, key, value, receiver) {
			const old = t[key];
			const res = Reflect.set(t, key, value, receiver);
			if (old !== value) trigger(t, key); // 触发更新
			return res;
		},
		deleteProperty(t, key) {
			const had = key in t;
			const res = Reflect.deleteProperty(t, key);
			if (had) trigger(t, key); // ⭐ 删除也能监听
			return res;
		}
	});
}
```

### 3. Watcher（订阅者）

```js
class Watcher {
	constructor(getter, cb) {
		this.getter = getter;
		this.cb = cb;
		this.get();
	}
	get() {
		Dep.target = this; // ⭐ 标记自己为"正在收集"
		const value = this.getter(); // 执行时会触发 getter → dep.depend()
		Dep.target = null; // ⭐ 收集完立刻清空
		return value;
	}
	update() {
		this.cb(this.get());
	}
}
```

**关键理解**：
依赖收集是靠 **"执行一遍取值函数，期间被读到的数据就是依赖"** 实现的。
`Dep.target` 这个全局变量是连接 Watcher 和 Dep 的桥梁。

---

## 为什么 Vue2 需要 `Vue.set`

`defineProperty` 只能劫持**已存在的属性**：

- **新增属性**检测不到 → `Vue.set(obj, key, val)`
- **删除属性**检测不到 → `Vue.delete`
- **数组索引赋值 / 改 length** 检测不到

### Vue2 怎么处理数组

**重写数组的 7 个变更方法**：
`push` `pop` `shift` `unshift` `splice` `sort` `reverse`

```js
const arrayProto = Array.prototype;
const arrayMethods = Object.create(arrayProto);

['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach((method) => {
	const original = arrayProto[method];
	arrayMethods[method] = function (...args) {
		const result = original.apply(this, args);
		this.__ob__.dep.notify(); // 手动通知
		return result;
	};
});
```

**Vue3 用 Proxy 就没这个问题**——
索引赋值、length 变化都能拦截到。

---

## 批量更新（异步队列）

数据连续改多次，不应该渲染多次：

```js
const queue = new Set();
let pending = false;

function queueWatcher(watcher) {
	queue.add(watcher);
	if (!pending) {
		pending = true;
		Promise.resolve().then(flush); // ⭐ 微任务，本轮同步代码跑完才执行
	}
}

function flush() {
	queue.forEach((w) => w.run());
	queue.clear();
	pending = false;
}
```

这展示了框架批量更新的基本思路。Vue 的真实调度器还处理任务优先级、去重、递归更新保护以及更新前后回调；`nextTick` 用于等待当前刷新周期完成，不能简单等同于上面的 Promise。

> 见 [06-Vue 生态/nextTick.md](../06-Vue生态/nextTick.md)
> 和 [01-JavaScript/eventloop 事件循环.md](../01-JavaScript/eventloop事件循环.md)

---

## 双向绑定 v-model 的本质

```html
<input v-model="msg" />
<!-- 等价于 -->
<input :value="msg" @input="msg = $event.target.value" />
```

**就是语法糖**——`value` 绑定 + `input` 事件监听。
面试问"v-model 原理"，答这个即可，
再补一句自定义组件上是 `modelValue` + `update:modelValue`（Vue3）。
