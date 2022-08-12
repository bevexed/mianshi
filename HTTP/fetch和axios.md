# fetch 和 axios

## fetch

浏览器底层API

### 优势

1. 语义简洁
2. 基于 Promise 实现，支持 async/await
3. 更加底层
4. 脱离 XHR，是 ES 规范里新的实现方式 

### 缺点

1. 只对网络请求报错
2. 默认不携带 `cookie`
3. 不支持 `abort`
4. 没办法原生监测请求的进度，而 `XHR` 可以



## axios

基于 Promise 用于浏览器和 nodejs 的 HTTP 客户端，本质上是对原生 XHR 的封装

### 优势

1. 支持 Promise API
2. 客户端支持防止 CSRF
3. 提供了一些并发请求的接口
4. 从 nodejs 创建 http 请求
5. 拦截请求和响应
6. 转换请求和响应数据
7. 取消请求
8. 转换请求和响应数据
9. 自动转换 JSON 数据

### 缺点

都被规避了