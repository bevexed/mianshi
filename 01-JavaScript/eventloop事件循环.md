# Event Loop（事件循环）

## 先区分执行线程和宿主能力

一个 JavaScript agent 同一时刻只执行一段 JS，但浏览器还会并行处理网络、计时、
渲染等宿主工作，也可以通过 Worker 运行其他 agent。异步 API 完成后不会“插入”当前函数，
而是安排任务或微任务，等待当前调用栈清空。

## 浏览器中的一轮

简化流程：

1. 从某个任务源选择一个 task 执行，例如初始脚本、定时器或事件回调。
2. task 执行完成后运行 microtask checkpoint，持续清空微任务队列。
3. 到达合适的渲染机会时，浏览器运行动画帧回调并更新渲染。
4. 继续下一轮。

“宏任务”是常用教学词，HTML 规范使用的是 **task**。不同 task source
不必被想象成一个严格的全局 FIFO 队列。

### 常见 task 来源

- 初始脚本
- `setTimeout` / `setInterval`
- 用户交互事件
- `MessageChannel`
- 部分 I/O 回调

### 常见微任务

- Promise reaction：`then` / `catch` / `finally`
- `queueMicrotask`
- `MutationObserver`

清空微任务时新加入的微任务也会继续执行，因此无限递归的微任务会让后续任务和渲染饥饿。

## Promise executor 和回调时机

```js
console.log(1);
new Promise((resolve) => {
	console.log(2); // executor 同步执行
	resolve();
}).then(() => console.log(4)); // reaction 是微任务
console.log(3);
// 1 2 3 4
```

## `async` / `await`

执行到 `await` 时先求值右侧表达式；async 函数暂停，后续恢复通过 Promise reaction 调度：

```js
async function run() {
	console.log(1);
	await helper();
	console.log(3);
}

function helper() {
	console.log(2);
}

run();
console.log(4);
// 1 2 4 3
```

“await 后面的代码相当于 then 回调”是好用的近似心智模型，
但复杂 thenable、异常和多次 await 仍应按规范的 async 语义分析。

## `requestAnimationFrame` 不是普通 task

`requestAnimationFrame` 属于浏览器更新渲染流程。典型情况下，当前 task 和微任务完成后，
浏览器在下一次绘制前运行 rAF 回调，再做样式、布局、绘制和合成；
浏览器并不保证每个 task 后都渲染一次，后台标签页也会被节流。

## 浏览器与 Node.js 的差异

- Node.js 由 libuv 阶段驱动 timers、poll、check、close 等回调。
- `setImmediate` 是 Node API，在 check 阶段执行。
- `process.nextTick` 使用 Node 自己的 next-tick 队列，不是 ECMAScript Promise 微任务；
  Node 会优先处理它，递归安排也可能饿死 I/O。
- Node 会在合适的回调边界处理 next-tick 和 Promise 微任务，
  不要把浏览器“task → 渲染”的图原样套到 Node。

> Node 细节见 [nodejs 事件轮询机制.md](../09-Node与服务端/nodejs事件轮询机制.md)。
