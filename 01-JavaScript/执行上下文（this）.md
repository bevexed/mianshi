#### 执行上下文（execute context）

1. 理解：代码执行的环境
2. 时机：代码正式执行之前会进入到执行环境

3. 工作：

   1. 创建变量对象

      1. 变量
      2. 函数及函数的参数
      3. 全局：window
      4. 局部：抽象的但是确实纯在

   2. 确认 this 的指向

      1. 全局：this ---> window
      2. 局部：this ---> 调用其的对象

   3. 创建作用域链

      1. 父级作用域链 + 当前的变量对象

   4. 扩展
```
      1. ECObj = {
        '量对象'：{变量，函数，函数的形参}，
        scopeChain：父级作用域链 + 当前的变量对象，
        this：{window || 调用其的对象}
}
```


## 考题
### 考题1
```js
function Foo() {
  getName = function () {
    console.log(1);
  }
  return this
}

Foo.getName = function () {
  console.log(2);
}

Foo.prototype.getName = function () {
  console.log(3);
}

var getName = function () {
  console.log(4);
}

function getName() {
  console.log(5);
}

Foo.getName() // 2
getName() // 4
Foo().getName() // 1
getName() // 1
new Foo().getName() // 3

```

### 考题2
```js
var o = {
  a:10,
  b:{
    fn:function (){
      console.log(this.a); // undefind
      console.log(this); // {fn: f}
    }
  }
}

o.b.fn()
```

### 考题3
```js
window.name = 'window'

function A() {
  this.name = 'A'
}

A.prototype.getA = function (){
  console.log(this);
  return this.name  + 1
}

let a = new A()
let funcA = a.getA
funcA() // this -> window

a.getA() // this -> a
```

### 考题4
```js
var length = 10
function fn(){
  return this.length + 1;
}

var obj = {
  length: 5,
  test1: function (){
    return fn()
  }
}

obj.test2 = fn
console.log(obj.test1());
console.log(fn() , obj.test2());
console.log(obj.test1() , obj.test2());
```

