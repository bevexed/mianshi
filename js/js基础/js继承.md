# js 继承
1. es6

    ```ecmascript 6
    class Parent {
      constructor() {
        this.age = 18
      }
    }

    class Child extends Parent {
      constructor() {
        super();
        this.name = 'aaa'
      }
    }
    ```

2. 原型链继承
   - 存在引用值共享的问题
      ```javascript
       function Parent(){
         this.age = 20
       }

       function Child(){
         this.name = 'aaa'
       }

       Child.prototype = new Parent()

       ```

3. 借用构造函数
   - 没办法拿到原型上的方法
      ```javascript
       function Parent(){
         this.age = 20
       }

       function Child(){
         this.name = 'aaa'
         Parent.call(this)
       }
       ```

4. 组合继承（伪经典继承）
   - 父构造函数会执行两次
      ```javascript
       function Parent(){
         this.age = 20
       }

       function Child(){
         this.name = 'aaa'
         Parent.call(this)
       }

       Child.prototype = new Parent()

       ```

5. 寄生组合继承(经典模式)
   - 123
    ```javascript
    function Parent() {
      this.age = 20
    }

    function Child() {
      this.name = 'aaa'
      Parent.call(this)
    }

    if (!Object.create) {
      Object.create = function (proto){
        function F() {}
        F.prototype = proto
        return new F()
      }

    }

    Child.prototype = Object.create(Parent.prototype)
    ```

6. 圣杯模式
