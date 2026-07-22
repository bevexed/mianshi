# 什么是 flex ，写出常见属性，以及作用

1. flex：Flexible Box，弹性布局，用来为盒状模型提供最大的灵活性。可以实现类似**垂直居中**布局。
2. 常见属性
   1. 容器属性
      1. flex-direction 决定主轴的方向
      2. flex-wrap 定义，如果一条轴线排不下，如何换行
      3. flex-flow 是 flex-direction 属性和 flex-wrap 属性的简写形式，默认值为 row nowrap
      4. justify-content 定义了项目在主轴上的对齐方式
      5. align-items 定义项目在交叉轴上如何对齐
      6. align-content 定义了多根轴线的对齐方式。如果项目只有一根轴线，该属性不起作用。
   2. 项目属性
      1. order 定义项目的排列顺序。数值越小，排列越靠前，默认为 0。
      2. flex-grow 定义项目的放大比例，默认为 0，即如果存在剩余空间，也不放大
      3. flex-shrink 定义了项目的缩小比例，默认为 1，即如果空间不足，该项目将缩小。负值对该属性无效
      4. flex-basis 在分配多余空间之前，项目占据的主轴空间（main size）。浏览器根据这个属性，计算主轴是否有多余空间。它的默认值为 auto，即项目的本来大小。
      5. flex 是 flex-grow, flex-shrink 和 flex-basis 的简写，默认值为 0 1 auto。后两个属性可选。
      6. align-self 允许单个项目覆盖容器的 align-items。默认值 auto 会采用容器的对齐值，
         但这不是普通 CSS 属性继承

## `flex` 简写的常见坑

- `flex: 1` 通常展开为 `1 1 0%`，不是默认值 `0 1 auto`。
- Flex item 默认 `min-width: auto`，长文本可能撑破容器；需要收缩时常加 `min-width: 0`。
- `align-content` 只在有多条 flex line 且交叉轴有剩余空间时生效，单行布局看不到效果。

## 详细教程

1. [Flex 布局教程：语法篇](https://www.ruanyifeng.com/blog/2015/07/flex-grammar.html)
2. [Flex 布局教程：实例篇](http://www.ruanyifeng.com/blog/2015/07/flex-examples.html)
