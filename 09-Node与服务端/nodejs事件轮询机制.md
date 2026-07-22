# Node.js 事件循环

Node.js 默认在一个 JavaScript 线程上执行回调，通过操作系统和 libuv 协调非阻塞 I/O。单线程指的是 JavaScript 回调的默认执行方式，并不表示进程只有一个系统线程。

## 主要阶段

```text
timers
  → pending callbacks
  → idle / prepare（内部使用）
  → poll
  → check
  → close callbacks
  → 下一轮
```

- `timers`：执行已达到时间阈值的 `setTimeout` / `setInterval` 回调。阈值不是精确执行时间。
- `pending callbacks`：处理延迟到下一轮的部分系统 I/O 回调。
- `poll`：获取新的 I/O 事件并执行大多数 I/O 回调；没有可执行任务时可能在此等待。
- `check`：执行 `setImmediate` 回调。
- `close callbacks`：处理部分句柄的 `close` 回调。

从 libuv 1.45（Node.js 20）开始，每轮事件循环中的 timer 主要在 poll 之后运行；旧资料里“poll 前后各跑一次 timers”的模型不能直接套用到新版本。启动事件循环前仍可能先处理一次 timer。

## nextTick 与微任务

`process.nextTick()` 不属于上述阶段。当前 JavaScript 操作结束后，Node 会先清空 nextTick 队列，再继续处理 Promise 等 V8 微任务，然后事件循环才有机会进入下一阶段。

```js
console.log('sync');

Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));

console.log('end');
// sync → end → nextTick → promise
```

递归安排 `process.nextTick()` 会让 I/O 长时间得不到执行，因此它只应用于确实需要“当前调用栈结束、事件循环继续前”执行的兼容场景。

## setImmediate 与 setTimeout(0)

- 在主模块中同时调度时，二者顺序受运行环境影响，不应依赖固定结果。
- 在同一个 I/O 回调内调度时，`setImmediate` 通常先在 check 阶段执行，timer 随后才满足调度机会。

```js
import { readFile } from 'node:fs';

readFile(new URL(import.meta.url), () => {
	setTimeout(() => console.log('timeout'), 0);
	setImmediate(() => console.log('immediate'));
});
```

## 与浏览器的区别

浏览器常用“一个宏任务 → 清空微任务 → 可能渲染”解释页面调度；Node.js 则要区分 libuv 阶段、nextTick 队列和 V8 微任务。二者都遵循“同步代码先执行、微任务在当前任务结束后清空”的基本规律，但宿主任务来源和阶段不同。

## 性能判断

- I/O 异步不等于回调可以执行很久；长同步计算会阻塞所有连接。
- CPU 密集工作可切片，或放入 Worker Threads、子进程、独立计算服务。
- 定位事件循环阻塞应结合 event loop delay、CPU profile 和慢请求链路，而不是只看平均 CPU。
