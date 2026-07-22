# CSS 选择器与继承

## 常见选择器

| 类型               | 示例                                                 |
| ------------------ | ---------------------------------------------------- |
| 通配、类型、类、ID | `*`、`button`、`.item`、`#app`                       |
| 属性               | `input[disabled]`、`[data-state="open"]`             |
| 后代、子代         | `.list .item`、`.list > .item`                       |
| 相邻、后续兄弟     | `h2 + p`、`h2 ~ p`                                   |
| 伪类               | `:hover`、`:focus-visible`、`:nth-child()`、`:not()` |
| 伪元素             | `::before`、`::after`、`::selection`                 |

现代组合伪类：

- `:is(a, button)` 取参数中最高特异性。
- `:where(a, button)` 自身特异性始终为 0，适合可覆盖的基础样式。
- `:has(> img)` 可根据后代或相邻关系选择父元素。

## 属性继承

文本相关属性如 `color`、`font-family`、`font-size`、`line-height` 通常继承；
盒模型属性如 `margin`、`padding`、`border`、`width` 通常不继承。
是否继承由每个属性的规范定义，不能只凭“看起来像文字属性”猜测。

通用关键字：`inherit` 强制继承、`initial` 使用规范初始值、
`unset` 对可继承属性表现为 inherit，否则表现为 initial、`revert` 回退到较低来源。
