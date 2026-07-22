# `call`、`apply`、`bind`

## 区别

| 方法                        | 是否立即调用 | 参数形式       | 返回值       |
| --------------------------- | ------------ | -------------- | ------------ |
| `fn.call(thisArg, a, b)`    | 是           | 参数逐个传入   | 函数执行结果 |
| `fn.apply(thisArg, [a, b])` | 是           | 数组或类数组   | 函数执行结果 |
| `fn.bind(thisArg, a)`       | 否           | 可预置部分参数 | 新函数       |

它们设置的是**调用时的 `this`**。箭头函数没有自己的 `this`，
所以用这三个方法调用箭头函数仍不会改变它捕获的词法 `this`。

## 简化手写

```js
function myCall(fn, thisArg, ...args) {
	if (typeof fn !== 'function') throw new TypeError('fn 必须是函数');
	return Reflect.apply(fn, thisArg, args);
}

function myApply(fn, thisArg, args = []) {
	if (typeof fn !== 'function') throw new TypeError('fn 必须是函数');
	return Reflect.apply(fn, thisArg, args == null ? [] : Array.from(args));
}

function myBind(fn, thisArg, ...boundArgs) {
	if (typeof fn !== 'function') throw new TypeError('fn 必须是函数');

	function bound(...args) {
		if (new.target) {
			// bind 后的函数被 new 调用时，绑定的 thisArg 会被忽略
			return Reflect.construct(fn, [...boundArgs, ...args], new.target);
		}
		return Reflect.apply(fn, thisArg, [...boundArgs, ...args]);
	}

	if (fn.prototype) {
		bound.prototype = Object.create(fn.prototype, {
			constructor: { value: bound, writable: true, configurable: true }
		});
	}
	return bound;
}
```

完整原生 `bind` 还涉及函数的 `length`、`name`、不可构造函数等规范细节；
面试手写通常重点检查参数预置、普通调用和 `new` 调用三条路径。
