# Proxy 与 Reflect

## Proxy 能拦截哪些操作

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

---

## Proxy 相比 Object.defineProperty 的优势

**这是 Vue2 → Vue3 响应式升级的核心原因，必答。**

| | defineProperty（Vue2） | Proxy（Vue3） |
|---|---|---|
| 拦截粒度 | **单个属性**，要递归遍历所有属性 | **整个对象**，惰性代理 |
| 新增属性 | ❌ 检测不到，需要 `Vue.set` | ✅ |
| 删除属性 | ❌ 需要 `Vue.delete` | ✅ |
| 数组 | ❌ 索引赋值/length 检测不到，Vue2 靠**重写数组方法**打补丁 | ✅ 原生支持 |
| Map/Set | ❌ | ✅ |
| 初始化性能 | 深层对象要递归全部处理 | **用到才代理**（惰性），大对象更快 |
| 兼容性 | IE9+ | **不支持 IE，无法 polyfill** |

最后一行很关键——Proxy 的能力无法用 ES5 模拟，
这就是为什么 Vue3 直接放弃了 IE。

> 关联：[06-Vue生态/2.0和3.0差异.md](../06-Vue生态/2.0和3.0差异.md)

---

## Reflect 是干什么的

**两个作用：**

1. **把语言内部操作变成函数调用**——
   `Reflect.get(obj, key)` 对应 `obj[key]`，
   `Reflect.has` 对应 `in`。行为更规范（比如失败时返回 false 而不是抛错）
2. **在 Proxy trap 里正确转发默认行为**

### 为什么不直接用 `target[key]`？关键在 receiver

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

---

## Proxy 的局限

- **无法代理内部槽（internal slots）**——
  `Date`、`Map`、`Set` 的方法依赖内部槽，
  直接代理后调用方法会报错，需要在 get trap 里绑定 this
- **性能开销**——每次属性访问都要走 trap
- **`===` 比较**——代理对象和原对象不相等，
  这在 Vue3 里表现为 `reactive(obj) !== obj`
