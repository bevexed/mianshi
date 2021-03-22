#### React 与 Vue 的区别

##### 相同点

1. 都是组件化开发 和 Virtual Dom
2. 都支持 props 进行父子组件间数据通信
3. 都支持数据驱动视图，不直接操作真实 DOM，更新状态数据界面自动更新
4. 都支持服务端渲染
5. 都支持 native 的方案



##### 不同点

1. 数据绑定
   - vue 双向数据绑定
   - react 单向数据绑定
2. 写法不同
   - vue 模板
   - react jsx
3. state 对象在 react 中不可改变，需要使用 setState 方法，在 vue 中 state 对象不是必须的，数据由 data 属性在 vue 对象中管理
4. Virtual DOM 的实现不用，
   - vue 会跟踪每一个逐渐的依赖关系，不需要重新渲染整个组件数
   - react ，每当应用状态发生改变，全部组件都会重新渲染，所以 react 中 需要 shouldComponentUpdate 这个 生命周期函数方法来进行控制
5. React 严格上只针对 MVC 的 view 层，Vue 则是 MVVM 模式

说出 vue 和 react 的生命周期，以及每个阶段都有什么用？

#### React生命周期

#### 挂载卸载过程

##### constructor()

完成了 React 数据的初始化，接收两个参数：props 和 context

##### componentWillMount()

componentWillMount()一般用的比较少，它更多的是在服务端渲染时使用。它代表的过程是组件已经经历了constructor()初始化数据后，但是还未渲染DOM时。

##### componentDIdMount()

组件第一次渲染完成，此时dom节点已经生成，可以在这里调用ajax请求，返回数据setState后组件会重新渲染

##### componenWillUnmount()

在此处完成组件的卸载和数据的销毁。

1. clear你在组建中所有的setTimeout,setInterval
2. 移除所有组建中的监听 removeEventListener

#### 更新过程

##### componentWillReceiveProps(nextProps)

在接受父组件改变后的props需要重新渲染组件时用到的比较多

接受一个参数nextProps

通过对比nextProps和this.props，将nextProps的state为当前组件的state，从而重新渲染组件

##### shoulComponentUpdate(nextProps, nextState)

主要用于性能优化(部分更新)

唯一用于控制组件重新渲染的生命周期，由于在react中，setState以后，state发生变化，组件会进入重新渲染的流程，在这里return false可以阻止组件的更新

因为react父组件的重新渲染会导致其所有子组件的重新渲染，这个时候其实我们是不需要所有子组件都跟着重新渲染的，因此需要在子组件的该生命周期中做判断

##### componentWillUpdate(nextProps, nextState)

shouldComponentUpdate返回true以后，组件进入重新渲染的流程，进入componentWillUpdate,这里同样可以拿到nextProps和nextState。

##### compoenntDIdUpdate(prevProps,prevState)

组件更新完毕后，react只会在第一次初始化成功会进入componentDidmount,之后每次重新渲染后都会进入这个生命周期，这里可以拿到prevProps和prevState，即更新前的props和state。

##### render()

render函数会插入jsx生成的dom结构，react会生成一份虚拟dom树，在每一次组件更新时，在此react会通过其diff算法比较更新前后的新旧DOM树，比较以后，找到最小的有差异的DOM节点，并重新渲染

#### Vue生命周期

- **beforeCreate**
- **created**
- **beforeMount**
- **mounted**
- **beforeUpdate**
- **updated**
- **beforeDestroy**
- **destroyed**