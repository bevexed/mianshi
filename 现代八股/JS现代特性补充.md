# JavaScript 现代特性（补充现有文档）

> 仓库 `js/js基础/` 已有 20 篇，闭包、原型链、this、Event Loop、
> 深浅拷贝、防抖节流都有了。**这篇只补缺口**：
> Map/WeakMap、Proxy/Reflect、Symbol、Generator/Iterator，
> 以及 ES2020+ 的新语法。

---

## 一、Map / Set / WeakMap / WeakSet

### Q1：Map 和 Object 的区别？

| | Object | Map |
|---|---|---|
| key 类型 | 只能是 string / symbol（其他会被转成 string） | **任意类型**，包括对象、函数、NaN |
| 顺序 | 整数键会被排序，其余按插入顺序 | **严格按插入顺序** |
| 取大小 | `Object.keys(o).length` | `map.size` |
| 迭代 | 需要先取 keys | 本身可迭代 |
| 原型污染 | 有继承来的属性（`toString` 等） | 无 |
| 频繁增删性能 | 较差 | **更好** |

**什么时候用 Object**：需要 JSON 序列化、结构固定的记录。
**什么时候用 Map**：key 不是字符串、需要频繁增删、需要保证顺序、需要知道大小。

**坑**：`obj['1']` 和 `obj[1]` 是同一个键，
但 `map.set('1')` 和 `map.set(1)` 是两个键。

### Q2：WeakMap 和 Map 的区别？有什么用？

- **WeakMap 的 key 必须是对象**，且是**弱引用**——
  如果这个对象没有其他引用了，会被 GC 回收，
  WeakMap 里对应的条目也自动消失
- **不可迭代**、没有 `size`——因为条目随时可能被回收，
  枚举结果不确定

**典型用途（要能举例，光背定义没用）**：
1. **给对象附加私有数据而不污染对象本身**
   ```js
   const privateData = new WeakMap()
   class User {
     constructor(name) { privateData.set(this, { name }) }
     getName() { return privateData.get(this).name }
   }
   ```
2. **缓存计算结果**——以对象为 key 缓存，
   对象销毁后缓存自动释放，**不会内存泄漏**
3. **记录 DOM 节点的关联数据**——节点从文档移除后自动清理

**面试加分**：用普通 Map 做对象缓存是**经典内存泄漏源**——
Map 持有强引用，对象永远不会被回收。
这也是 [性能篇](性能与CoreWebVitals.md) Q8 提到的泄漏成因之一。

---

## 二、Proxy / Reflect

### Q3：Proxy 能拦截哪些操作？

```js
const p = new Proxy(target, {
  get(t, key, receiver) {},        // 读属性
  set(t, key, value, receiver) {}, // 写属性
  has(t, key) {},                  // in 操作符
  deleteProperty(t, key) {},       // delete
  ownKeys(t) {},                   // Object.keys / for...in
  apply(t, thisArg, args) {},      // 函数调用
  construct(t, args) {},           // new
  // 共 13 种 trap
})
```

### Q4：Proxy 相比 Object.defineProperty 的优势？

**这是 Vue2 → Vue3 响应式升级的核心原因，必答：**

| | defineProperty（Vue2） | Proxy（Vue3） |
|---|---|---|
| 拦截粒度 | **单个属性**，要递归遍历所有属性 | **整个对象**，惰性代理 |
| 新增属性 | ❌ 检测不到，需要 `Vue.set` | ✅ |
| 删除属性 | ❌ 需要 `Vue.delete` | ✅ |
| 数组 | ❌ 索引赋值/length 检测不到，Vue2 靠**重写数组方法**打补丁 | ✅ 原生支持 |
| Map/Set | ❌ | ✅ |
| 初始化性能 | 深层对象要递归全部处理 | **用到才代理**（惰性），大对象更快 |
| 兼容性 | IE9+ | **不支持 IE，无法 polyfill** |

**最后一行很关键**——Proxy 的能力无法用 ES5 模拟，
这就是为什么 Vue3 直接放弃了 IE。

### Q5：Reflect 是干什么的？为什么要和 Proxy 配合？

**两个作用：**
1. **把语言内部操作变成函数调用**——
   `Reflect.get(obj, key)` 对应 `obj[key]`，
   `Reflect.has` 对应 `in`。行为更规范（比如失败时返回 false 而不是抛错）
2. **在 Proxy trap 里正确转发默认行为**

**为什么不直接用 `target[key]`？关键在 `receiver`：**

```js
const proxy = new Proxy(obj, {
  get(target, key, receiver) {
    // ❌ 直接访问：getter 里的 this 指向 target，绕过了代理
    // return target[key]

    // ✅ 正确转发：this 指向 receiver（代理对象），嵌套属性也能被拦截
    return Reflect.get(target, key, receiver)
  }
})
```
如果对象里有 getter 且 getter 内部访问了 `this.other`，
用 `target[key]` 会导致 `this.other` 读的是原对象，**代理失效**。
**这个细节是 Proxy 题的深水区，答出来很加分。**

### Q6：Proxy 有什么局限？

- **无法代理内部槽（internal slots）**——
  `Date`、`Map`、`Set` 的方法依赖内部槽，
  直接代理后调用方法会报错，需要在 get trap 里绑定 this
- **性能开销**——每次属性访问都要走 trap
- **`===` 比较**——代理对象和原对象不相等，
  这在 Vue3 里表现为 `reactive(obj) !== obj`

---

## 三、Symbol

### Q7：Symbol 有什么用？

1. **唯一的属性键**——避免命名冲突，
   给第三方对象加属性时不会覆盖已有的
2. **模拟私有属性**——不会被 `Object.keys` / `JSON.stringify` 枚举到
   （但 `Object.getOwnPropertySymbols` 能拿到，**不是真私有**）
3. **Well-known Symbols——定制语言行为**（这是重点）

```js
// 让对象可迭代
obj[Symbol.iterator] = function* () { yield 1; yield 2 }
[...obj]  // [1, 2]

// 定制 instanceof
class A { static [Symbol.hasInstance](x) { return typeof x === 'string' } }
'abc' instanceof A  // true

// 定制类型转换
obj[Symbol.toPrimitive] = hint => hint === 'number' ? 42 : 'str'

// 定制 Object.prototype.toString 的结果
obj[Symbol.toStringTag] = 'MyType'
```

**`Symbol.for` vs `Symbol()`**：
前者在全局注册表里查找/创建，同名返回同一个；
后者每次都是新的唯一值。

---

## 四、Generator / Iterator

### Q8：迭代器协议是什么？

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

### Q9：Generator 是什么？

- `function*` 定义，`yield` 暂停并返回值，
  调用 `next()` 恢复执行
- **本质是可暂停、可恢复的函数**——
  这是它区别于普通函数最重要的性质
- `next(value)` 传入的值会成为上一个 `yield` 表达式的返回值，
  实现**双向通信**

### Q10：Generator 有什么实际用途？

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

### Q11：async/await 和 Generator 的关系？

- `async/await` 本质是 **Generator + 自动执行器**的语法糖
- Generator 需要手动调 `next()` 驱动，
  async 函数由引擎自动驱动（遇到 await 就等 Promise resolve 后继续）
- **手写一个 co 函数**是常见的进阶题：
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

---

## 五、ES2020+ 语法

### Q12：这几年新增了哪些常用语法？

| 特性 | 版本 | 说明 |
|---|---|---|
| `?.` 可选链 | ES2020 | `a?.b?.c`，短路返回 undefined |
| `??` 空值合并 | ES2020 | 只在 null/undefined 时取右边 |
| `??=` `||=` `&&=` | ES2021 | 逻辑赋值 |
| `Promise.allSettled` | ES2020 | 全部结束（不管成败）才 resolve |
| `Promise.any` | ES2021 | **第一个成功**的就 resolve（对比 `race` 是第一个结束的）|
| `String.replaceAll` | ES2021 | 不用写正则 `/g` 了 |
| `Array.at(-1)` | ES2022 | 支持负索引 |
| `Object.hasOwn` | ES2022 | 替代 `hasOwnProperty.call` |
| **顶层 await** | ES2022 | 模块顶层可直接 await |
| **类私有字段 `#x`** | ES2022 | 真正的私有，外部无法访问 |
| `Array.findLast` | ES2023 | 从后往前找 |
| `Object.groupBy` | ES2024 | 按 key 分组 |

### Q13：Promise 的几个静态方法区别？

| 方法 | 何时 resolve | 何时 reject |
|---|---|---|
| `all` | **全部成功** | **任一失败**（快速失败） |
| `allSettled` | **全部结束**（无论成败） | 永不 reject |
| `race` | **第一个结束**的（成功或失败） | 第一个结束的是失败 |
| `any` | **第一个成功**的 | **全部失败**（抛 AggregateError） |

**实际场景**：
- 并行请求多个接口，一个挂了不影响其他 → `allSettled`
- 请求超时控制 → `race`（请求 vs 定时器）
- 多个 CDN 源取最快能用的 → `any`

> 仓库已有 [promise的all实现.md](../js/promise/promise的all实现.md)，
> 可以顺手把 `allSettled` / `any` 的手写实现也补进去。
