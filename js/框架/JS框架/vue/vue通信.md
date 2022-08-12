vue通信

##### 通信种类

- 父组件向子组件通信
- 子组件向父组件通信
- 隔代组件通信
- 兄弟组件间的通信

##### 实现通信的方式

- props

  - 一般属性实现父向子组件
  - 通过函数属性实现子向父通信
  - 缺点：隔代组件和兄弟组件间通信比较麻烦

- vue 自定义事件

  - 子：this.$emit('eventName', data)
  - 父：\<MyComp @eventName="callback"\>
  - 只适合子向父通信

- 消息订阅预发布

  - 需要引入消息订阅与发布的实现库 pubsub-js
    - 订阅消息：pubSub.subscribe('msg',(msg,data)=>{})
    - 发布订阅：PubSub.publish('msg',data)

- vuex

  - vue 官方提供

- slot

  - 专门实现父向子传递数据的标签

  

