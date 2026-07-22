# 执行上下文与 `this`

## 执行上下文

执行全局代码、函数或模块时，引擎会建立执行上下文，用来保存当前的词法环境、
变量环境、`this` 绑定等运行状态。函数调用形成调用栈；函数返回后对应执行上下文出栈。

“变量对象（VO/AO）”是旧版规范和教材中的解释模型，现代 ECMAScript 规范使用
Lexical Environment、Environment Record 等概念。面试时能说明作用域、闭包和调用栈即可，
不必把旧术语当成真实 JavaScript 对象。

## 普通函数的 `this` 看调用方式

优先级可以这样记：

1. `new Fn()`：`this` 是新实例。
2. `fn.call(x)` / `apply` / `bind`：显式指定；但绑定函数被 `new` 时忽略绑定对象。
3. `obj.fn()`：`this` 是点号前的接收者 `obj`。
4. `fn()`：严格模式下是 `undefined`；非严格脚本中通常替换为 `globalThis`。

```js
'use strict';

function show() {
	return this;
}

const obj = { show };
obj.show(); // obj
const detached = obj.show;
detached(); // undefined
show.call({ id: 1 }); // { id: 1 }
```

`this` 不是由函数“定义在哪里”决定的；那是普通函数作用域的规则，不是 `this` 的规则。

## 箭头函数的 `this`

箭头函数没有自己的 `this`，它捕获外层词法环境中的 `this`：

```js
const counter = {
	value: 1,
	later() {
		setTimeout(() => console.log(this.value), 0); // 捕获 later 的 this
	}
};
```

因此 `call` / `apply` / `bind` 不能改写箭头函数的 `this`，箭头函数也不能被 `new`。

## 容易踩坑的调用形式

```js
const user = {
	name: 'A',
	getName() {
		return this.name;
	}
};

user.getName(); // 'A'
const getName = user.getName;
getName(); // 严格模式下 this 是 undefined，读取时报错

const { getName: extracted } = user;
extracted.call({ name: 'B' }); // 'B'
```

方法赋给变量或作为裸回调传递后，接收者信息会丢失；可用包装箭头函数或 `bind` 保留：

```js
button.addEventListener('click', () => user.getName());
button.addEventListener('click', user.getName.bind(user));
```
