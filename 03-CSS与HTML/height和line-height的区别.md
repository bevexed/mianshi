# `height` 和 `line-height`

- `height` 控制盒子内容区或由 `box-sizing` 参与计算后的尺寸约束。
- `line-height` 控制行盒的高度，影响行内内容的基线间距；它不是元素盒子的固定高度。

多行文本的总高度通常由行数、`line-height`、padding、border 等共同决定。
单行文本可以通过让 `line-height` 等于容器高度实现视觉居中，但换行或字体缩放后会失效。

```css
body {
	line-height: 1.5; /* 推荐无单位值，子元素继承比例而不是父元素算出的像素值 */
}
```
