# css 盒模型

## css 盒模型有哪些

1. 标准盒模型
2. IE 盒模型

## css 盒模型区别

1. `content-box`：声明的 `width` / `height` 只计算 content，padding 和 border 额外增加外部尺寸。
2. `border-box`：声明的 `width` / `height` 包含 content、padding 和 border。

margin 始终在边框之外，不计入两种 `box-sizing` 的 width/height。

## 如何转换盒模型

> ⚠️ **原文写的是 `display: content-box`，属性名错了。**
> 控制盒模型的是 **`box-sizing`**，不是 `display`。
> 这个错误在白板上写出来会被当场纠正。

```css
box-sizing: content-box; /* 标准盒模型（默认） */
box-sizing: border-box; /* IE 盒模型 */
```

**实践**：现代项目基本都全局设成 `border-box`，
因为「设了 width 就是最终宽度」更符合直觉，布局时不用反复减 padding。

```css
*,
*::before,
*::after {
	box-sizing: border-box;
}
```

## 补充：两种盒模型的实际差异

```css
.box {
	width: 200px;
	padding: 20px;
	border: 10px solid;
}
```

- `content-box`：内容 200px，**实际占位 260px**（200 + 20×2 + 10×2）
- `border-box`：**实际占位 200px**，内容被压缩成 140px（200 - 20×2 - 10×2）

> **margin 不计入盒子尺寸**——它是盒子外部的间距，
> 两种模型下都一样。原文把 margin 列进盒模型组成部分容易造成误解。
