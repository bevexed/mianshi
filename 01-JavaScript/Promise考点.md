# Promise 核心考点

- `new Promise(executor)` 的 **executor 同步立即执行**。
- `then` / `catch` / `finally` 注册的反应回调异步进入微任务队列。
- Promise 状态只能从 pending 变为 fulfilled 或 rejected，确定后不可逆。
- `then` 每次都返回一个新 Promise，因此可以链式调用；返回普通值会成为下一步结果，
  返回 Promise/thenable 会被吸收，抛错会让下一步拒绝。
- `catch(onRejected)` 等价于 `then(undefined, onRejected)`。
- `finally` 不接收结果；正常返回时透传原值，抛错或返回拒绝 Promise 时会覆盖原结果。

```js
console.log(1);
const promise = new Promise((resolve) => {
	console.log(2);
	resolve(3);
});
promise.then(console.log);
console.log(4);
// 1、2、4、3
```

静态方法对比见 [Promise 静态方法对比.md](Promise静态方法对比.md)，
手写实现见 [手写题/手写 Promise.md](手写题/手写Promise.md)。
