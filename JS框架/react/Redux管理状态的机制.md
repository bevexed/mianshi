#### Redux

1. 独立的状态管理 JS 库
2. 可以结合 react，angular，vue等使用
3. 集中式管理 react 应用中多个组件共享的状态，和后台获取数据



##### 原理

发布订阅模式



##### 扩展

- react-redux 简化 redux 编码
- redux-thunk 实现 redux 异步编程
- redux devtools 实现 chrome 中 redux 的调试





##### 机制

- store
  - 内部包含 state
  - 方法：
    - getState()

- reducers

- action creator
  - 方法
    - dispatch()







##### 问题

1. Redux 是如何将 State 注入到 React 组件上去的
   1.  与 React 产生关联的是 React-Redux 库
   2.  Redux 原理就是一个**发布订阅器**，
       1. 用一个变量存储所有 State
       2. 提供发布功能修改数据
       3. 订阅功能触发回调
   3. React-Redux 的作用是订阅 Store 里数据的更新，包含 Provider 和 connect 两个重要方法
   4. Provider 的作用是通过 Context API 吧 Store 对象注入到 React 组件上去
   5. connect 方法就是一个高阶组件 ，在高阶组件里通过订阅 Store 中数据的更新，从而通过调用 setState 方法来触发组件更新

