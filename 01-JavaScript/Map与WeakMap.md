# Map / Set / WeakMap / WeakSet

## Map 和 Object 的区别

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
但 `map.set('1')` 和 `map.set(1)` 是两个不同的键。

---

## WeakMap 和 Map 的区别

- **WeakMap 的 key 必须是对象**，且是**弱引用**——
  如果这个对象没有其他引用了，会被 GC 回收，
  WeakMap 里对应的条目也自动消失
- **不可迭代**、没有 `size`——因为条目随时可能被回收，
  枚举结果不确定

### 典型用途（要能举例，光背定义没用）

**1. 给对象附加私有数据而不污染对象本身**
```js
const privateData = new WeakMap()
class User {
  constructor(name) { privateData.set(this, { name }) }
  getName() { return privateData.get(this).name }
}
```

**2. 缓存计算结果**——以对象为 key 缓存，
对象销毁后缓存自动释放，**不会内存泄漏**

**3. 记录 DOM 节点的关联数据**——节点从文档移除后自动清理

### 面试加分点

用**普通 Map 做对象缓存是经典内存泄漏源**——
Map 持有强引用，对象永远不会被回收。

> 关联：[08-性能优化/内存泄漏排查.md](../08-性能优化/内存泄漏排查.md)
