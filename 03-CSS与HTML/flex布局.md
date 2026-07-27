# CSS Flex 布局

## 面试速答

Flexbox 是一维布局模型，擅长沿一条主轴排列元素、分配剩余空间，并在交叉轴上
完成对齐。它适合导航栏、工具栏、按钮组、垂直居中和组件内部布局；如果需要同时
控制行和列，通常优先考虑 [Grid](grid布局.md)。

使用时先在父元素设置 `display: flex`，再通过：

- `flex-direction` 决定主轴方向。
- `justify-content` 控制主轴对齐。
- `align-items` 控制一条 flex line 内项目的交叉轴对齐。
- `flex-wrap` 决定是否换行，`align-content` 控制多行整体的交叉轴对齐。
- 子项通过 `flex`、`align-self`、`order` 和自动 margin 控制尺寸与位置。

工程上最常见的坑是：`flex: 1` 不是默认值、`flex-shrink` 按“收缩因子 × 基准尺寸”
分配负空间，以及 flex item 默认的自动最小尺寸可能让长文本撑破容器。

## 一、核心概念

```css
.container {
	display: flex; /* 块级 flex 容器 */
	/* display: inline-flex; 行内级 flex 容器 */
}
```

- **Flex container**：设置了 `display: flex/inline-flex` 的元素。
- **Flex item**：容器的直接子元素；更深层的后代不会自动成为 flex item。
- **主轴 main axis**：项目主要排列的方向，由 `flex-direction` 决定。
- **交叉轴 cross axis**：与主轴垂直的方向。
- **Flex line**：一行或一列项目。开启换行后可以产生多条 line。

“主轴等于横轴”并不严谨。默认书写模式下，`row` 通常是水平方向，`column`
通常是垂直方向；书写模式或文本方向变化后，应以 main/cross axis 理解。

## 二、容器属性

| 属性              | 常用值                                                             | 作用                                   |
| ----------------- | ------------------------------------------------------------------ | -------------------------------------- |
| `flex-direction`  | `row`、`row-reverse`、`column`、`column-reverse`                   | 决定主轴及项目排列方向                 |
| `flex-wrap`       | `nowrap`、`wrap`、`wrap-reverse`                                   | 决定是否创建多条 flex line             |
| `flex-flow`       | `<direction> <wrap>`                                               | 上面两项的简写，默认 `row nowrap`      |
| `justify-content` | `start`、`center`、`space-between`、`space-around`、`space-evenly` | 分配主轴剩余空间                       |
| `align-items`     | `stretch`、`start`、`center`、`end`、`baseline`                    | 控制项目在所属 line 内的交叉轴对齐     |
| `align-content`   | `stretch`、`start`、`center`、`space-between` 等                   | 控制多条 line 在交叉轴上的整体分布     |
| `gap`             | `<row-gap> <column-gap>`                                           | 设置项目之间的间距，不产生容器外侧间距 |

### `align-items` 和 `align-content` 的区别

- `align-items` 对齐的是每条 line 里的项目，单行和多行都可能生效。
- `align-content` 分配的是多条 line 之间的交叉轴剩余空间。
- 对 `flex-wrap: nowrap` 的单行 flex 容器，`align-content` 不生效。

## 三、项目属性

| 属性          | 默认值     | 作用                         |
| ------------- | ---------- | ---------------------------- |
| `order`       | `0`        | 数值越小，视觉排列越靠前     |
| `flex-grow`   | `0`        | 有正剩余空间时的放大因子     |
| `flex-shrink` | `1`        | 空间不足时的收缩因子         |
| `flex-basis`  | `auto`     | 分配剩余空间前的主轴基准尺寸 |
| `flex`        | `0 1 auto` | `grow shrink basis` 的简写   |
| `align-self`  | `auto`     | 覆盖单个项目的 `align-items` |

`align-self: auto` 表示采用容器的 `align-items`，但这不是普通的 CSS 属性继承。

## 四、`flex` 尺寸分配原理

### 1. 先确定 flex base size

浏览器先根据 `flex-basis` 计算项目的基准尺寸：

- `flex-basis: 200px`：以 `200px` 作为基准。
- `flex-basis: auto`：通常读取主轴对应的 `width` 或 `height`；该值也是 `auto`
  时，再根据内容尺寸计算。
- `flex-basis: content`：直接根据内容计算基准尺寸。

当 `flex-basis` 不是 `auto` 时，它在主轴尺寸计算中通常优先于 `width/height`。

### 2. 有正剩余空间时按 `flex-grow` 分配

容器宽 `600px`，两个项目的 basis 分别为 `100px`、`200px`，grow 分别为
`1`、`2`：

```text
剩余空间 = 600 - 100 - 200 = 300
第一个项目 = 100 + 300 × 1 / 3 = 200
第二个项目 = 200 + 300 × 2 / 3 = 400
```

`flex-grow` 表示分配比例，不表示最终宽度比例；原始 basis 不同时，最终宽度未必
按 grow 比例相等。

### 3. 空间不足时按缩放后的 `flex-shrink` 分配

容器宽 `240px`，两个项目 basis 为 `100px`、`200px`，shrink 都是 `1`：

```text
缺少空间 = 300 - 240 = 60
收缩权重 = shrink × basis = 100 : 200
第一个项目 = 100 - 60 × 1 / 3 = 80
第二个项目 = 200 - 60 × 2 / 3 = 160
```

因此 shrink 相同并不表示收缩相同的像素数。实际算法还会反复处理
`min-width/max-width` 等限制，被限制的项目会先冻结，再重新分配空间。

## 五、`flex` 简写怎么选

| 写法              | 常见展开        | 使用场景                              |
| ----------------- | --------------- | ------------------------------------- |
| `flex: initial`   | `0 1 auto`      | 默认行为：不放大、可以缩小            |
| `flex: auto`      | `1 1 auto`      | 保留内容/宽度基准，同时参与放大和缩小 |
| `flex: none`      | `0 0 auto`      | 固定为自身尺寸，不放大也不缩小        |
| `flex: 1`         | 通常为 `1 1 0%` | 忽略内容基准，均分可用空间            |
| `flex: 0 0 12rem` | `0 0 12rem`     | 固定侧栏或固定尺寸项目                |
| `flex: 1 1 20rem` | `1 1 20rem`     | 以 `20rem` 为理想基准，可伸缩         |

不要把 `flex: 1` 解释成“宽度为 1 份”就结束。它真正表达的是：允许放大、允许
缩小、基准尺寸接近 0，再参与剩余空间分配。

## 六、常见布局

### 1. 水平垂直居中

```css
.container {
	display: flex;
	justify-content: center;
	align-items: center;
}
```

### 2. 固定侧栏 + 自适应主区域

```css
.layout {
	display: flex;
	gap: 16px;
}

.sidebar {
	flex: 0 0 240px;
}

.main {
	flex: 1 1 auto;
	min-width: 0; /* 允许主区域缩到内容的 min-content 尺寸以下 */
}
```

### 3. 工具栏把操作按钮推到末尾

```css
.toolbar {
	display: flex;
	align-items: center;
	gap: 8px;
}

.toolbar__actions {
	margin-inline-start: auto; /* 自动 margin 会先吸收主轴剩余空间 */
}
```

### 4. 等宽选项卡

```css
.tabs {
	display: flex;
}

.tab {
	flex: 1 1 0;
	min-width: 0;
}
```

### 5. 页脚贴底

```css
.page {
	min-height: 100dvh;
	display: flex;
	flex-direction: column;
}

.page__main {
	flex: 1 0 auto;
}
```

## 七、Flex 与 Grid 如何取舍

| 维度       | Flex                                     | Grid                               |
| ---------- | ---------------------------------------- | ---------------------------------- |
| 布局模型   | 一维，重点处理一个主轴                   | 二维，同时设计行和列               |
| 驱动方式   | 内容驱动，先有项目再分配空间             | 结构驱动，先定义轨道再放置项目     |
| 换行后对齐 | 每条 line 独立计算，跨行列不一定对齐     | 所有项目共享网格线，跨行列容易对齐 |
| 位置控制   | 依赖项目顺序和弹性分配                   | 可按网格线、区域精确放置和跨行跨列 |
| 典型场景   | 导航、工具栏、按钮组、媒体对象、局部居中 | 页面骨架、卡片矩阵、表单、仪表盘   |

选择口诀：

1. 只关心“横着排还是竖着排”以及剩余空间怎么分，优先 Flex。
2. 需要同时规划行列，或要求不同项目沿共同列线对齐，优先 Grid。
3. 不要按“页面用 Grid、组件用 Flex”机械划分；判断标准是布局关系。
4. 二者经常嵌套：外层 Grid 负责页面结构，卡片内部 Flex 负责图文和按钮排列。

具体场景：

| 场景                         | 建议        | 原因                                     |
| ---------------------------- | ----------- | ---------------------------------------- |
| 导航栏：Logo、链接、右侧按钮 | Flex        | 单行排列，自动 margin 很方便             |
| 数量不定的标签/按钮自然换行  | Flex        | 更关注内容尺寸和自然流动                 |
| 自适应卡片列表且各列需要对齐 | Grid        | `repeat()` + `minmax()` 可直接定义列轨道 |
| 两列表单且标签要纵向对齐     | Grid        | 多行共享同一组列线                       |
| 卡片内“标题在上、按钮贴底”   | Flex column | 只处理一条纵向主轴                       |
| 仪表盘模块跨行跨列           | Grid        | 需要二维放置和 `span`                    |

更完整的 Grid 属性与案例见 [CSS Grid 布局](grid布局.md)。

## 八、常见陷阱

### 1. 长文本把容器撑破

Flex item 在主轴上的 `min-width/min-height` 默认是 `auto`，通常包含基于内容的
自动最小尺寸。文本省略不生效时，常需要把真正参与收缩的那一层设为：

```css
.item {
	min-width: 0;
}
```

纵向 Flex 中的可滚动子区域则常需要 `min-height: 0`。

### 2. `width` 没按预期生效

检查 `flex-basis`、grow/shrink 和最小尺寸。`width: 200px` 不等于最终一定是
`200px`，因为它可能只是 `flex-basis: auto` 时的计算起点。

### 3. 多行 Flex 不是二维网格

开启 `flex-wrap` 后，每条 flex line 独立分配主轴空间。第二行不会自动继承第一行
的列宽；需要严格列对齐时用 Grid。

### 4. `order` 改的是视觉顺序

`order`、`row-reverse`、`column-reverse` 通常不会同步改变 DOM、阅读和键盘焦点
顺序。不能用视觉重排替代合理的源码顺序。

### 5. `gap` 不是 margin

`gap` 只创建项目之间的间距，不会在容器四周产生外边距，也不参与 margin
collapse。

## 九、常见追问

### `margin: auto` 和 `justify-content` 谁先分空间？

主轴上的自动 margin 会先吸收正剩余空间；吸收后通常不会再留给
`justify-content` 分配。因此工具栏中常用 `margin-inline-start: auto` 推开后续
操作区。

### `flex-wrap: wrap` 后为什么 `align-content` 仍看不出效果？

除了开启多行模式，还要让交叉轴有可分配的剩余空间。例如横向 Flex 通常需要明确
容器高度，且内容实际产生多条 line。

### Flex 可以实现二维布局吗？

可以通过嵌套或换行做出类似效果，但多行之间没有共享列轨道。需求本质是二维对齐时，
Grid 的表达更直接、维护成本更低。

## 参考规范

- [CSS Flexible Box Layout Module Level 1](https://drafts.csswg.org/css-flexbox/)
- [CSS Box Alignment Module](https://drafts.csswg.org/css-align/)
