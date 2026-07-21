# Promise 静态方法对比

> 考点清单见 [Promise考点.md](Promise考点.md)，手写实现见 [手写题/手写Promise.md](手写题/手写Promise.md)

## 四个方法的区别

| 方法 | 何时 resolve | 何时 reject |
|---|---|---|
| `all` | **全部成功** | **任一失败**（快速失败） |
| `allSettled` | **全部结束**（无论成败） | 永不 reject |
| `race` | **第一个结束**的（成功或失败） | 第一个结束的是失败 |
| `any` | **第一个成功**的 | **全部失败**（抛 `AggregateError`） |

**记忆方式**：
- `all` / `allSettled` 都要等全部，区别是**能不能容忍失败**
- `race` / `any` 都是取第一个，区别是**要不要求成功**

---

## 实际场景

| 场景 | 用哪个 | 为什么 |
|---|---|---|
| 首页并行请求多个模块数据，一个挂了不影响其他 | `allSettled` | 用 `all` 会因为一个接口失败导致整页空白 |
| 请求超时控制 | `race` | 请求 vs 定时器，谁先结束用谁 |
| 多个 CDN 源取最快可用的 | `any` | 只要有一个成功就够了 |
| 必须全部成功才能继续（如提交前的多项校验） | `all` | 快速失败正是想要的 |

### 超时控制的写法

```js
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
  ])
```

**注意**：`race` 只是让你**不再等待**，
原来的请求**并不会被取消**——真正要取消得用 `AbortController`。
这个区别经常被追问。

---

## 返回值形态

```js
Promise.all([p1, p2])        // → [v1, v2]
Promise.allSettled([p1, p2]) // → [{status:'fulfilled',value}, {status:'rejected',reason}]
Promise.race([p1, p2])       // → 第一个结束的值
Promise.any([p1, p2])        // → 第一个成功的值
```
