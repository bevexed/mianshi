## 原理
- 发布订阅模式

```js
const PENDING = 'pending'
const RESOLVED = 'resolved'
const REJECTED = 'rejected'
function Promise(excutor) {
  this.state = PENDING
  this.value = null
  this.resolvedCallbacks = []
  this.rejectedCallbacks = []

  // 执行器 - 立即执行构造函数
  excutor(
    value => {
    if (this.state === PENDING) {
      this.state = RESOLVED
      this.value = value
      this.resolvedCallbacks.forEach(callback => callback(value))
    }
  }, value => {
    if (this.state === PENDING) {
      this.state = REJECTED
      this.value = value
      this.rejectedCallbacks.forEach(callback => callback(value))
    }
  })
}
Promise.prototype.then = function (onFulfilled = () => {}, onRejected= () => {}) {
  if (this.state === PENDING) {
    this.resolvedCallbacks.push(onFulfilled)
    this.rejectedCallbacks.push(onRejected)
  }
  if (this.state === RESOLVED) {
    onFulfilled(this.value)
  }
  if (this.state === REJECTED) {
    onRejected(this.value)
  }
}

Promise.prototype.catch = function (){
  return this.then(null, fn)
}
```

