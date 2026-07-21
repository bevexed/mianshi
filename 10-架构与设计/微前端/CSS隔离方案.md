# 微前端 CSS 隔离方案

> 这题和你「Angular + React 样式冲突」的经历直接对应，必须答好。

## 四种方案对比

| 方案 | 原理 | 问题 |
|---|---|---|
| **Shadow DOM**<br>（qiankun `strictStyleIsolation`） | 子应用挂在 shadow root 里，天然隔离 | **弹窗类组件会挂到 body 上，跑到 shadow 外面就失去样式**；第三方 UI 库大量踩雷。实际很少能用 |
| **Scoped CSS**<br>（qiankun `experimentalStyleIsolation`） | 给子应用所有选择器加上 `div[data-qiankun="app"]` 前缀 | 动态插入的样式、body 上的元素仍然管不到 |
| **约定前缀 / 命名空间** | 手动给类名加前缀，UI 库配置 `prefixCls` | 需要人工约束，但**最可控、副作用最小** |
| **CSS Modules / CSS-in-JS** | 编译期生成唯一类名 | 只能管自己写的样式，管不了第三方库和全局样式 |

---

## 为什么 Shadow DOM 实际用不了

**这是最值得讲的一点：**

antd 的 `Modal`、`Select` 下拉、`Tooltip`、`message`
默认都挂载到 `document.body`——
**一旦跑到 shadow root 外面，样式立刻失效**，
弹窗变成没有样式的裸 DOM。

理论上可以配 `getPopupContainer` 把它们挂回 shadow 内，
但要改所有用到的地方，且第三方库未必都提供这个配置。

> **"土但可控" 是生产环境的正确选择。**

---

## 实践中的推荐路线

**约定前缀 + 严格约束全局样式**：

```jsx
// antd 5
<ConfigProvider prefixCls="sub-app">
  <App />
</ConfigProvider>
```

配合：
- 子应用**禁止写全局选择器**（`body`、`*`、标签选择器）
- reset/normalize 只在主应用引一次
- 用 lint 规则卡住裸标签选择器

---

## Angular 的样式隔离

- **默认 `ViewEncapsulation.Emulated`**——
  编译时给组件模板元素加 `_ngcontent-xxx` 属性，
  样式选择器也加上对应属性选择器，
  **模拟出 Shadow DOM 的效果但不真的用 Shadow DOM**
- 另外两种：
  - `None`——完全不隔离，样式全局泄漏
  - `ShadowDom`——真 Shadow DOM

### 坑

`::ng-deep` 会**穿透隔离**，
老项目里这个满天飞的话，等于隔离形同虚设。
接手老 Angular 项目时这是第一个要盘的东西。

---

## Vue 的 scoped

- `<style scoped>` 编译时给元素加 `data-v-xxx` 属性，
  原理和 Angular 的 Emulated 一样
- **穿透写法**：`:deep()`（Vue3）/ `::v-deep`（Vue2）
- **坑**：scoped 只作用于当前组件的**根元素和自身元素**，
  子组件的根元素也会被匹配到（这是设计如此，便于调整子组件布局）

> 详见 [06-Vue生态/scoped.md](../../06-Vue生态/scoped.md)

---

## Vue2 / Vue3 共存时的特殊问题

**element-ui（Vue2）和 element-plus（Vue3）类名前缀都是 `el-`**，
样式冲突非常严重。

**解法**：
- element-plus 支持配置 namespace：
  ```js
  app.use(ElementPlus, { namespace: 'ep' })
  ```
  同时要改 SCSS 变量 `$namespace`
- 或者严格保证两个子应用不同时挂载

【需确认】你在 PMS 项目里实际是怎么处理的？
