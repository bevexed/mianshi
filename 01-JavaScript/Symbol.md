# Symbol

## Symbol 有什么用

**1. 唯一的属性键**——避免命名冲突，
给第三方对象加属性时不会覆盖已有的

**2. 模拟私有属性**——不会被 `Object.keys` / `JSON.stringify` 枚举到
（但 `Object.getOwnPropertySymbols` 能拿到，**不是真私有**）

> 真正的私有用 ES2022 的类私有字段 `#x`，见 [ES2020 后新语法.md](ES2020后新语法.md)

**3. Well-known Symbols——定制语言行为**（这是重点）

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

---

## `Symbol.for` vs `Symbol()`

- `Symbol('desc')`——每次调用都是**新的唯一值**
- `Symbol.for('key')`——在**全局注册表**里查找/创建，同名返回同一个
  （可以跨 iframe、跨 realm 共享）

```js
Symbol('a') === Symbol('a'); // false
Symbol.for('a') === Symbol.for('a'); // true
```
