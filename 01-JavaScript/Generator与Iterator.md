# Generator 与 Iterator

## 迭代器协议

一个对象只要有 `[Symbol.iterator]` 方法，返回一个含 `next()` 的对象，
就是**可迭代对象**，可以用于 `for...of`、展开运算符、解构。

```js
const range = {
  from: 1, to: 3,
  [Symbol.iterator]() {
    let cur = this.from, last = this.to
    return { next: () => cur <= last ? { value: cur++, done: false } : { done: true } }
  }
}
[...range]  // [1, 2, 3]
```

---

## Generator 是什么

- `function*` 定义，`yield` 暂停并返回值，调用 `next()` 恢复执行
- **本质是可暂停、可恢复的函数**——这是它区别于普通函数最重要的性质
- `next(value)` 传入的值会成为**上一个 `yield` 表达式的返回值**，
  实现**双向通信**

```js
function* gen() {
  const x = yield 1      // next(10) 时 x === 10
  const y = yield x + 1
  return y
}
const it = gen()
it.next()     // { value: 1, done: false }
it.next(10)   // { value: 11, done: false }
it.next(20)   // { value: 20, done: true }
```

---

## Generator 的实际用途

**别只说"async/await 的前身"，举实际用途：**

1. **实现迭代器**——比手写 `next()` 简洁得多
2. **惰性求值 / 无限序列**
   ```js
   function* naturals() { let n = 0; while (true) yield n++ }
   ```
3. **async/await 的底层原理**——
   `async function` 可以用 Generator + 自动执行器（co 函数）模拟
4. **Redux-Saga** 用它做副作用管理，
   好处是 yield 出去的是**描述**而非执行，便于测试
5. **协程式的流程控制**

---

## async/await 和 Generator 的关系

- `async/await` 本质是 **Generator + 自动执行器**的语法糖
- Generator 需要手动调 `next()` 驱动，
  async 函数由引擎自动驱动（遇到 await 就等 Promise resolve 后继续）

### 手写 co 函数（常见进阶题）

```js
function co(gen) {
  const it = gen()
  return new Promise((resolve, reject) => {
    function step(val) {
      const { value, done } = it.next(val)
      if (done) return resolve(value)
      Promise.resolve(value).then(step, reject)
    }
    step()
  })
}
```

> 关联：[eventloop事件循环.md](eventloop事件循环.md) —— await 之后的代码相当于 `.then` 回调，属于微任务
