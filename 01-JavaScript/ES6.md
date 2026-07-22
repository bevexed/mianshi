# ES2015（ES6）常用特性

ES6 是 ES2015 的历史称呼。常见新增包括：

- `let` / `const` 与块级作用域
- 箭头函数
- 模板字符串、解构、默认参数、剩余参数和展开语法
- class、模块 `import` / `export`
- `Promise`
- `Map` / `Set` / `WeakMap` / `WeakSet`
- `Symbol`、Iterator、Generator

## 两个高频边界

### `let` / `const` 也会被创建，但有 TDZ

词法声明在进入作用域时已经建立绑定，只是在执行声明前处于
**暂时性死区（TDZ）**，访问会抛出 `ReferenceError`。
因此“完全不存在提升”是便于记忆但不够严谨的说法。

### 箭头函数

- 没有自己的 `this`、`arguments`、`super` 和 `new.target`，从外层词法环境获取。
- 不能作为构造函数调用，也没有用于构造实例的 `prototype`。
- 不能作为 Generator 函数。

`async` / `await` 是 ES2017；类字段、顶层 await 等更新内容见
[ES2020 后新语法.md](ES2020后新语法.md)。装饰器也不属于 ES2015。
