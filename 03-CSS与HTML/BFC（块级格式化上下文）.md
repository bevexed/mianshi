# BFC（Block Formatting Context）

BFC 是块级盒参与布局的一种独立格式化上下文。它会影响内部块盒的排列、
浮动参与高度计算以及与外部浮动的关系，但“独立”不等于内部外部完全互不影响。

## 常见创建方式

- 根元素 `<html>`。
- `float` 不是 `none`。
- `position: absolute` 或 `fixed`。
- `overflow` 不是 `visible` / `clip`。
- `display: flow-root`。
- `display: inline-block`、table cell/caption。
- flex/grid item 在不是 flex/grid/table container 的情况下也会建立 BFC。

`display: flex` 和 `display: grid` 建立的是各自的 flex/grid formatting context，
它们往往能解决类似隔离问题，但不应简单说“flex 容器就是 BFC”。

## 三个高频作用

### 1. 包含浮动

```css
.parent {
	display: flow-root;
}
.child {
	float: left;
}
```

父元素建立新的 BFC 后，计算自动高度时会包含内部浮动。新代码优先 `flow-root`，
而不是用 `overflow: hidden` 顺便触发，因为后者还会裁剪溢出内容。

### 2. 避开外部浮动

BFC 的 border box 不会与同一块格式化上下文中的浮动 margin box 重叠，
可用于传统的浮动两栏布局。现代布局通常直接用 Flex/Grid。

### 3. 理解 margin 折叠

同一 BFC 中、没有边框/内边距/内容等分隔的相邻块级垂直 margin 可能折叠。
创建新的 BFC 可以阻止**内部元素的 margin 与上下文外元素**发生某些折叠，
但同一个 BFC 内相邻普通块的 margin 仍可能折叠。

## 面试回答

先说“BFC 是块布局上下文”，再举 `display: flow-root` 包含浮动和 margin 折叠边界。
不要背成“BFC 内外绝对互不影响”，也不要把所有能形成新布局上下文的 display 值
都机械归类成 BFC。
