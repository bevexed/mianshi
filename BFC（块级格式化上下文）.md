# BFC（Block Formatting Context）

BFC 即 **块级格式化上下文**。

1. 它是一个独立的渲染区域，只有Block-level Box参与，
2. 它规定了内部的Block-level Box如何布局，并且与这个区域外部毫不相干。



### Box：css布局的基本单位

Box是CSS布局的基本单位，一个页面由多个Box组成。

- 元素的类型和dispaly属性，决定box属性
- 不同类型的Box，会参与不同的Formatting Context，因此Box内的元素会以不同的方式渲染
  - block-level box：display 属性为 block、list-item、table 的元素，会生成 block-level box，并参与 block formatting content
  - inline-level box：display 属性为 inline、inline-block、inline-table 的元素，会生成 inline-level box，并参与 inline formatting content
  - run-in box：css3 才有



### Formatting Context

它是页面的一块渲染区域，并且有一套渲染规则，他决定了子元素将如何定位，以及和其他元素的关系和相互作用。最常见的 Formatting Context 有 Block Formatting Context（BFC） 和 Inline Formatting Context（IFC）



### BFC的布局规则

- 内部BOX会在垂直方向，一个接一个的放置
- Box垂直方向的距离由margin决定。属于同一个BFC的两个相邻Box的margin会发生重叠
- 每个盒子（块盒和行盒）的margin box 的左边，与包含块border box的左边相接触。浮动也是如此
- BFC 区域不会与float box 重叠
- BFC就是页面上的一个隔离的独立容器，容器里面的子元素不会影响到外面的元素
- 计算BFC的高度时，浮动元素也参与计算



### 如何创建BFC

- float的值不能是none
- position的值不能static、relative
- display的值是inline-block、table-cell、flex、table-caption、inline-flex
- overflow的值不是visible



### BFC作用

1. 利用BFC避免margin重叠
2. 自适应两栏布局
3. 清除浮动