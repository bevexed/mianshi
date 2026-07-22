# JavaScript 继承

## 现代写法：class `extends`

```js
class Parent {
	constructor(name) {
		this.name = name;
	}

	say() {
		return this.name;
	}
}

class Child extends Parent {
	constructor(name, age) {
		super(name); // 派生类在使用 this 前必须调用 super()
		this.age = age;
	}
}
```

class 没有改变原型继承模型：实例方法仍在 `prototype` 上；
`extends` 同时建立实例侧和构造函数静态侧的原型关系。

## ES5：寄生组合继承

```js
function Parent(name) {
	this.name = name;
}

Parent.prototype.say = function () {
	return this.name;
};

function Child(name, age) {
	Parent.call(this, name); // 初始化每个实例自己的属性
	this.age = age;
}

Child.prototype = Object.create(Parent.prototype, {
	constructor: {
		value: Child,
		writable: true,
		configurable: true
	}
});
Object.setPrototypeOf(Child, Parent); // 如需继承静态属性
```

## 旧方案为什么有问题

| 方案                              | 问题                                                |
| --------------------------------- | --------------------------------------------------- |
| `Child.prototype = new Parent()`  | 父构造函数中的引用属性会被所有子实例共享            |
| 只用 `Parent.call(this)`          | 只能拿到实例属性，拿不到 `Parent.prototype` 方法    |
| 组合继承：`call` + `new Parent()` | 父构造函数执行两次，并在子原型上留下多余实例属性    |
| 寄生组合继承                      | 用 `Object.create` 连接原型，不执行第二次父构造函数 |

面试重点不是背“六种继承”，而是能画出实例原型链，并解释为什么
`Object.create(Parent.prototype)` 比 `new Parent()` 更适合建立原型关系。
