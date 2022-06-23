# nodejs 事件轮询机制

1. timers 定时器阶段

   计时和执行到点的定时器回调函数

2. pending callbacks

   某些系统操作（例如TCP错误类型）的回调函数

3. idel, prepare

   准备工作

4. poll 轮询阶段（轮询队列）

   1. 如果轮询队列不为空，依次同步取出轮询队列中第一个回调函数执行，直到轮询队列为空或者达到系统的最大限制
   2. 如果轮询队列为空
      1. 如果之前设置过 setImmediate 函数，直接进入下一个 check 阶段
      2. 如果之前没有设置过 setInnediate 函数，在当前 poll 阶段等待
         1. 直到轮询队列添加回调函数，就去第一个情况执行
         2. 如果定时器到点了，也会去下一个阶段

5. check 查询阶段

   1. 执行 setImmediate 设置的回调函数

6. close callbacks 关闭阶段

   1. 执行 close 事件回调函数



> Process.nextTick 可以在任何阶段优先执行

