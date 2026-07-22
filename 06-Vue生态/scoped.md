# Vue SFC Scoped CSS

`<style scoped>` 是编译期样式隔离。编译器为当前组件模板节点添加
`data-v-xxxx` 属性，并改写 CSS 选择器。

```vue
<style scoped>
.button {
	color: red;
}
</style>
```

大致编译为：

```css
.button[data-v-xxxx] {
	color: red;
}
```

它不是 Shadow DOM，仍受正常层叠、权重、继承和样式注入顺序影响。

## 子组件根节点

父组件的 scoped 样式可以影响子组件的根节点，用于布局是有意设计，
但不应依赖子组件内部 DOM 结构。

## 深度选择器

```vue
<style scoped>
.wrapper :deep(.third-party-button) {
	border-radius: 8px;
}
</style>
```

当前语法是 `:deep(...)`。`/deep/` 和 `>>>` 是旧写法，
新代码不应继续使用。

## 其他能力

```css
/* 作用于全局节点 */
:global(body) {
	margin: 0;
}

/* 混合从插槽内容进入的选择器 */
:slotted(.item) {
	color: var(--accent);
}
```

## 实践边界

- 优先使用组件对外暴露的 props、CSS 变量或 class API，
  `:deep()` 是最后的适配手段。
- 深度选择器紧耦合第三方 DOM，升级库后容易失效，应把覆盖集中管理。
- 递归组件中的后代选择器可能匹配到嵌套实例，选择器要尽量精确。
