# `new` 操作符

## 对普通构造函数做了什么

1. 创建一个对象，并把它的 `[[Prototype]]` 指向构造函数的 `prototype`。
2. 以新对象作为 `this` 调用构造函数。
3. 构造函数显式返回对象或函数时使用该返回值；返回原始值时忽略它。

```js
function myNew(Constructor, ...args) {
	if (typeof Constructor !== 'function') {
		throw new TypeError('Constructor 必须是函数');
	}

	const candidate = Constructor.prototype;
	const prototype =
		candidate !== null && (typeof candidate === 'object' || typeof candidate === 'function')
			? candidate
			: Object.prototype;
	const instance = Object.create(prototype);
	const result = Constructor.apply(instance, args);
	const isObject = result !== null && (typeof result === 'object' || typeof result === 'function');
	return isObject ? result : instance;
}
```

这个手写版用于解释普通函数构造过程，不能调用 `class`（class 不能被 `apply`）。
生产代码若要完整遵循构造语义，直接使用 `Reflect.construct(Constructor, args)`。
