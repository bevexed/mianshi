# 手写 Promise（教学版）

> Promise 不是简单的发布订阅：它还包含状态不可逆、thenable 吸收、
> 链式返回值解析和微任务调度。下面实现用于理解 Promise/A+ 核心行为，
> 不包含原生 Promise 的 species、调试钩子等全部规范细节。

```js
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';
const scheduleMicrotask =
	typeof queueMicrotask === 'function'
		? queueMicrotask
		: (callback) => Promise.resolve().then(callback);

class MyPromise {
	constructor(executor) {
		if (typeof executor !== 'function') throw new TypeError('executor 必须是函数');
		this.state = PENDING;
		this.value = undefined;
		this.reactions = [];
		let alreadyResolved = false;

		const rejectInternal = (reason) => {
			if (this.state !== PENDING) return;
			this.state = REJECTED;
			this.value = reason;
			this.flush();
		};

		const resolveValue = (value) => {
			if (this.state !== PENDING) return;
			if (value === this) return rejectInternal(new TypeError('不能用自身完成 Promise'));

			if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
				let then;
				try {
					then = value.then;
				} catch (error) {
					rejectInternal(error);
					return;
				}

				if (typeof then === 'function') {
					let called = false;
					try {
						then.call(
							value,
							(next) => {
								if (called) return;
								called = true;
								if (next === value) rejectInternal(new TypeError('thenable 不能用自身完成'));
								else resolveValue(next);
							},
							(reason) => {
								if (called) return;
								called = true;
								rejectInternal(reason);
							}
						);
					} catch (error) {
						if (!called) rejectInternal(error);
					}
					return;
				}
			}

			this.state = FULFILLED;
			this.value = value;
			this.flush();
		};

		// executor 首次调用 resolve/reject 后立即锁定，thenable 尚未完成时也不能被另一方抢占
		const resolve = (value) => {
			if (alreadyResolved) return;
			alreadyResolved = true;
			resolveValue(value);
		};

		const reject = (reason) => {
			if (alreadyResolved) return;
			alreadyResolved = true;
			rejectInternal(reason);
		};

		try {
			executor(resolve, reject);
		} catch (error) {
			reject(error);
		}
	}

	flush() {
		if (this.state === PENDING) return;
		const reactions = this.reactions.splice(0);
		for (const reaction of reactions) reaction();
	}

	then(onFulfilled, onRejected) {
		let nextPromise;
		nextPromise = new MyPromise((resolve, reject) => {
			const run = () => {
				scheduleMicrotask(() => {
					try {
						const handler = this.state === FULFILLED ? onFulfilled : onRejected;
						if (typeof handler !== 'function') {
							if (this.state === FULFILLED) resolve(this.value);
							else reject(this.value);
							return;
						}

						const result = handler(this.value);
						if (result === nextPromise) {
							reject(new TypeError('then 链不能返回自身'));
						} else {
							resolve(result);
						}
					} catch (error) {
						reject(error);
					}
				});
			};

			if (this.state === PENDING) this.reactions.push(run);
			else run();
		});
		return nextPromise;
	}

	catch(onRejected) {
		return this.then(undefined, onRejected);
	}

	finally(onFinally) {
		const callback = typeof onFinally === 'function' ? onFinally : () => undefined;
		return this.then(
			(value) => MyPromise.resolve(callback()).then(() => value),
			(reason) =>
				MyPromise.resolve(callback()).then(() => {
					throw reason;
				})
		);
	}

	static resolve(value) {
		return value instanceof MyPromise ? value : new MyPromise((resolve) => resolve(value));
	}

	static reject(reason) {
		return new MyPromise((_, reject) => reject(reason));
	}
}
```

需要能解释的关键点：

1. executor 同步执行，但 `then` 回调通过微任务异步运行。
2. 每次 `then` 返回新 Promise，普通值、异常和 thenable 分别走不同解析路径。
3. 状态确定后不可改变；不可信 thenable 即使多次调用回调也只能生效一次。
4. 循环返回自身必须拒绝，否则链会永远等待。

静态组合方法见 [手写 Promise-all.md](手写Promise-all.md)。
