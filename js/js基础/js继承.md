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
   ```javascript
    function Parent(){
      this.age = 20
    }

    function Child(){
      this.name = 'aaa'
      Parent.call(this)
    }
    ```

4. 组合继承
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
