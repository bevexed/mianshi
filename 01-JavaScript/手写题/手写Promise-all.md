# 手写 Promise 静态方法

> 原文件为空，本篇补写。
> 完整的 Promise 实现见 [手写 Promise.md](手写Promise.md)，
> 四个方法的区别见 [../Promise 静态方法对比.md](../Promise静态方法对比.md)

## Promise.all

**要点（面试官就看这几个）**：

1. 返回 Promise
2. 用 `Promise.resolve()` 包一层，**兼容非 Promise 的值**
3. **结果顺序必须和输入顺序一致**——不能用 push
4. 用**计数器**判断全部完成，不能用 `results.length`
5. 任一失败立刻 reject
6. 空数组直接 resolve

```js
Promise.myAll = function (iterable) {
	return new Promise((resolve, reject) => {
		const items = Array.from(iterable);
		const results = new Array(items.length);
		let count = 0;

		if (items.length === 0) return resolve([]);

		items.forEach((item, index) => {
			Promise.resolve(item).then(
				(value) => {
					results[index] = value; // ⭐ 按 index 放，保证顺序
					if (++count === items.length) resolve(results); // ⭐ 计数器
				},
				reject // 任一失败直接 reject
			);
		});
	});
};
```

### 常见错误写法

```js
// ❌ 用 push：并发下完成顺序 ≠ 输入顺序
results.push(value);

// ❌ 用 results.length 判断：按 index 赋值会让 length 提前达标
if (results.length === items.length) resolve(results);
```

---

## Promise.allSettled

**永不 reject**，每一项包装成 `{status, value|reason}`：

```js
Promise.myAllSettled = function (iterable) {
	const items = Array.from(iterable);
	return Promise.myAll(
		items.map((item) =>
			Promise.resolve(item).then(
				(value) => ({ status: 'fulfilled', value }),
				(reason) => ({ status: 'rejected', reason })
			)
		)
	);
};
```

**用 all 复用是最简洁的写法**——
因为每一项都被转成了永远成功的 Promise。

---

## Promise.race

**第一个结束的（无论成败）决定结果**：

```js
Promise.myRace = function (iterable) {
	return new Promise((resolve, reject) => {
		for (const item of iterable) {
			Promise.resolve(item).then(resolve, reject);
		}
	});
};
```

**关键理解**：不需要额外判断"是不是第一个"——
**Promise 状态一旦确定就不可逆**，
后面的 resolve/reject 调用自然失效。

**注意**：空数组时**永远 pending**（这是规范行为，不是 bug）。

---

## Promise.any

**第一个成功的 resolve；全部失败才 reject（AggregateError）**：

```js
Promise.myAny = function (iterable) {
	return new Promise((resolve, reject) => {
		const items = Array.from(iterable);
		const errors = new Array(items.length);
		let count = 0;

		if (items.length === 0) {
			return reject(new AggregateError([], 'All promises were rejected'));
		}

		items.forEach((item, index) => {
			Promise.resolve(item).then(
				resolve, // 第一个成功就 resolve
				(err) => {
					errors[index] = err;
					if (++count === items.length) {
						reject(new AggregateError(errors, 'All promises were rejected'));
					}
				}
			);
		});
	});
};
```

**和 all 是镜像关系**——
all 是"收集成功、任一失败就挂"，
any 是"收集失败、任一成功就成"。

---

## 顺手准备：并发控制池

并发池需要额外处理同步抛错、并发上限校验、结果顺序和取消语义。
为避免同一实现维护两份，完整版本统一放在
[算法-前端专属.md](算法-前端专属.md#九并发控制池高频)。

**用途**：大文件分片上传、批量请求限流。注意“限制并发数”不等于限流；
如果要求每秒最多 N 次，还需要令牌桶、漏桶或显式的时间窗口。

> 见 [12-场景题/大文件上传与断点续传.md](../../12-场景题/大文件上传与断点续传.md)
