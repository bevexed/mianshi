# 微前端 CSS 隔离方案

CSS 隔离没有对所有应用都最优的方案，应结合弹层挂载位置、第三方组件、浏览器兼容性和迁移成本选择。

## 四种方案对比

| 方案                                                       | 原理                                                  | 问题                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| **Shadow DOM**<br>（qiankun `strictStyleIsolation`）       | 子应用挂在 shadow root 中，浏览器提供样式边界         | 挂到 `body` 的弹层离开边界；全局主题和第三方组件需要适配 |
| **Scoped CSS**<br>（qiankun `experimentalStyleIsolation`） | 给子应用所有选择器加上 `div[data-qiankun="app"]` 前缀 | 动态插入的样式、body 上的元素仍然管不到                  |
| **约定前缀 / 命名空间**                                    | 手动给类名加前缀，UI 库配置 `prefixCls`               | 需要人工约束，但**最可控、副作用最小**                   |
| **CSS Modules / CSS-in-JS**                                | 编译期生成唯一类名                                    | 只能管自己写的样式，管不了第三方库和全局样式             |

---

## Shadow DOM 的集成难点

**这是最值得讲的一点：**

antd 的 `Modal`、`Select` 下拉、`Tooltip`、`message`
默认都挂载到 `document.body`——
如果弹层跑到 shadow root 外面，shadow 内的样式不会覆盖它，
弹窗变成没有样式的裸 DOM。

理论上可以配 `getPopupContainer` 把它们挂回 shadow 内，
但要改所有用到的地方，且第三方库未必都提供这个配置。

这不代表 Shadow DOM 一定不可用；如果组件库允许统一配置挂载容器并经过完整测试，它仍可提供更强边界。

---

## 常见的渐进路线

存量系统通常先采用命名空间配合限制全局样式，再按需要评估更强隔离：

```jsx
// antd 5
<ConfigProvider prefixCls="sub-app">
	<App />
</ConfigProvider>
```

配合：

- 子应用**禁止写全局选择器**（`body`、`*`、标签选择器）
- reset/normalize 只在主应用引一次
- 用 lint 规则检查不符合约定的全局选择器

---

## Angular 的样式隔离

- **默认 `ViewEncapsulation.Emulated`**——
  编译时给组件模板元素加 `_ngcontent-xxx` 属性，
  样式选择器也加上对应属性选择器，
  **模拟出 Shadow DOM 的效果但不真的用 Shadow DOM**
- 另外两种：
  - `None`——完全不隔离，样式全局泄漏
  - `ShadowDom`——真 Shadow DOM

`::ng-deep` 会**穿透隔离**，
而且已被弃用，不应作为新代码的长期方案。存量代码应盘点其影响范围并逐步替换。

---

## Vue 的 scoped

- `<style scoped>` 编译时给元素加 `data-v-xxx` 属性，
  原理和 Angular 的 Emulated 一样
- **穿透写法**：`:deep()`（Vue3）/ `::v-deep`（Vue2）
- **坑**：scoped 只作用于当前组件的**根元素和自身元素**，
  子组件的根元素也会被匹配到（这是设计如此，便于调整子组件布局）

> 详见 [06-Vue 生态/scoped.md](../../06-Vue生态/scoped.md)

---

## Vue2 / Vue3 共存时的特殊问题

element-ui（Vue 2）和 Element Plus（Vue 3）默认类名前缀都使用 `el-`，同页加载时存在选择器和主题变量冲突风险。

**解法**：

- element-plus 支持配置 namespace：
  ```js
  app.use(ElementPlus, { namespace: 'ep' });
  ```
  同时要改 SCSS 变量 `$namespace`
- 或者严格保证两个子应用不同时挂载

如果不能完整更改 namespace，避免两个应用同时挂载也是一种边界清晰的降级方案。
