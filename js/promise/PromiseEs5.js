const PENDING = 'pending'
const RESOLVED = 'resolved'
const REJECTED = 'rejected'
function Promise(executor) {
  this.state = PENDING
  this.value = null
  this.resolvedCallbacks = []
  this.rejectedCallbacks = []

  // 执行器 - 立即执行构造函数
  executor(
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

Promise.prototype.catch = function (fn){
  return this.then(null, fn)
}


new Promise((resolve,reject)=>{
  resolve(1)
}).then(res=>{
  console.log(res);
}).then(err=>{
  console.log(err);
})
