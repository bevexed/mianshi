# vue 声明周期

![vue生命周期](vue生命周期.png)

## 系统自带
1. beforeCreate
2. created ($data)
3. beforeMount
4. mounted ($el)
5. beforeUpdate
6. updated
7. beforeDestroy
8. destroyed



## keep-alive 附带
1. activated
2. deactivated

### 进入带有 keep-alive 的页面执行的生命周期
1. 第一次进入
   1. beforeCreate
   2. created ($data
   3. beforeMount
   4. mounted (dom)
   5. activated
2. 第二次进入
   1. activated
