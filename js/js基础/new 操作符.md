# new 操作符

## 具体做了什么
1. 创建了一个空对象
2. 将空对象的原型指向构造函数的原型
3. 改变this指向（将空对象作为构造函数的上下文）
4. 对构造函数有返回值的处理判断（返回基本类型则忽略，引用类型直接返回引用类型）

```js
function Fun(name,age){
  this.name = name
  this.age = age
}

function create(fn, ...args){
  // 1. 创建了一个空对象
  var obj = {}
  // 2. 将空对象的原型指向构造函数的原型
  Object.setPrototypeOf(obj, fn.prototype)
  // 3. 改变this指向（将空对象作为构造函数的上下文）
  var res = fn.apply(obj,args)
  // 4. 对构造函数有返回值的处理判断（返回基本类型则忽略，引用类型直接返回引用类型）
  return res instanceof Object ? res : obj
}

console.log(create(Fun, '张三', 18));
```
