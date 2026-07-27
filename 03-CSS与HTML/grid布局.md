# CSS Grid 布局

## 面试速答

Grid 是二维布局模型，可以同时控制行和列。父元素通过
`grid-template-columns/rows` 定义轨道，子元素可以按网格线、命名区域或自动放置
算法进入网格，并使用 `span` 跨行跨列。

它适合页面骨架、卡片矩阵、表单、仪表盘等需要二维对齐的场景。Flex 更适合沿一条
主轴分配空间的内容驱动布局。二者不是替代关系，经常是外层 Grid、组件内部 Flex。

常用写法：

```css
.cards {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
	gap: 16px;
}
```

## 一、核心概念

```css
.container {
	display: grid; /* 块级 Grid 容器 */
	/* display: inline-grid; 行内级 Grid 容器 */
}
```

- **Grid container**：设置了 `display: grid/inline-grid` 的元素。
- **Grid item**：Grid 容器的直接子元素。
- **Grid line**：划分网格的线，行列编号从 `1` 开始，也可以从末尾用负数编号。
- **Grid track**：两条相邻网格线之间的一行或一列。
- **Grid cell**：一条行轨道与一条列轨道交叉形成的单元格。
- **Grid area**：一个或多个相邻单元格组成的矩形区域。

### 显式网格与隐式网格

- `grid-template-columns/rows/areas` 定义的是**显式网格**。
- 项目超出显式范围，或自动放置需要新轨道时，浏览器创建**隐式网格**。
- 隐式轨道的尺寸由 `grid-auto-columns/rows` 控制，未设置时通常是 `auto`。

## 二、容器属性

| 属性                    | 作用                                     |
| ----------------------- | ---------------------------------------- |
| `grid-template-columns` | 定义显式列轨道及其尺寸                   |
| `grid-template-rows`    | 定义显式行轨道及其尺寸                   |
| `grid-template-areas`   | 用可视化字符串定义命名区域               |
| `grid-template`         | 上述显式网格属性的简写                   |
| `grid-auto-columns`     | 设置隐式列轨道尺寸                       |
| `grid-auto-rows`        | 设置隐式行轨道尺寸                       |
| `grid-auto-flow`        | 控制自动放置方向，可选 `dense` 回填空位  |
| `grid`                  | 显式与隐式网格相关属性的总简写           |
| `gap`                   | 行列间距，可拆成 `row-gap`、`column-gap` |
| `justify-items`         | 项目在各自网格区域内沿 inline axis 对齐  |
| `align-items`           | 项目在各自网格区域内沿 block axis 对齐   |
| `place-items`           | `align-items justify-items` 的简写       |
| `justify-content`       | 整张网格在容器内沿 inline axis 的位置    |
| `align-content`         | 整张网格在容器内沿 block axis 的位置     |
| `place-content`         | `align-content justify-content` 的简写   |

### `items` 和 `content` 的区别

- `justify-items/align-items`：对齐每个项目在自己网格区域里的位置。
- `justify-content/align-content`：当网格总尺寸小于容器时，对齐整张网格。

```css
.container {
	width: 600px;
	display: grid;
	grid-template-columns: repeat(2, 160px);
	justify-content: center; /* 把总宽 320px 的网格放到容器中间 */
	align-items: center; /* 每个项目在自己的网格区域内居中 */
}
```

## 三、轨道尺寸

### 1. 固定、百分比和内容尺寸

```css
.layout {
	display: grid;
	grid-template-columns: 240px 1fr;
	grid-template-rows: auto minmax(0, 1fr) auto;
}
```

常见轨道值：

- `<length>`、`<percentage>`：固定或相对容器尺寸。
- `auto`：根据内容和可用空间计算。
- `min-content`：内容不溢出的最小内在尺寸。
- `max-content`：内容不换行等情况下的理想内在尺寸。
- `fit-content()`：在内容尺寸和给定上限之间约束轨道。

### 2. `fr`：分配剩余空间

```css
.container {
	grid-template-columns: 1fr 2fr;
}
```

两列按 `1:2` 分配可伸缩空间，但不是简单地拿容器总宽直接除三。固定轨道、gap、
内容最小尺寸等会先参与计算。

Grid 轨道默认可能受内容的最小尺寸约束。长文本导致 `1fr` 列溢出时可使用：

```css
.container {
	grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
}

.item {
	min-width: 0;
}
```

### 3. `minmax()`

```css
.container {
	grid-template-columns: 240px minmax(0, 1fr);
}
```

`minmax(min, max)` 为轨道设置最小和最大值。常见用途是让主内容可扩展，又允许它在
空间不足时真正收缩。

### 4. `repeat()`

```css
.container {
	grid-template-columns: repeat(4, 1fr);
}
```

等价于连续写四次 `1fr`。它也可以与自动重复结合：

```css
.cards {
	grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}
```

### 5. `auto-fill` 与 `auto-fit`

二者都会在容器允许时创建尽可能多的重复列：

- `auto-fill`：保留当前能容纳的空轨道，因此即使没有项目，空列仍可能占位。
- `auto-fit`：自动放置后折叠空轨道，让已有项目扩展占用空出来的空间。

项目数量少于可容纳列数时，两者差异最明显；项目足够多时效果常相同。

## 四、放置项目

### 1. 按网格线放置

```css
.item {
	grid-column-start: 2;
	grid-column-end: 4;
	grid-row-start: 1;
	grid-row-end: 3;
}
```

常用简写：

```css
.item {
	grid-column: 2 / 4;
	grid-row: 1 / 3;
}
```

### 2. 使用 `span` 和负数网格线

```css
.item {
	grid-column: span 2; /* 跨两列 */
}

.header {
	grid-column: 1 / -1; /* 从第一条线跨到显式网格最后一条线 */
}
```

`-1` 指显式网格的最后一条线，不一定包含后来创建的全部隐式轨道。

### 3. 命名网格线

```css
.container {
	grid-template-columns:
		[sidebar-start] 240px
		[sidebar-end content-start] minmax(0, 1fr)
		[content-end];
}

.main {
	grid-column: content-start / content-end;
}
```

### 4. 命名区域

```css
.page {
	display: grid;
	grid-template:
		'header header' auto
		'sidebar main' minmax(0, 1fr)
		'footer footer' auto
		/ 240px minmax(0, 1fr);
	min-height: 100dvh;
}

.header {
	grid-area: header;
}
.sidebar {
	grid-area: sidebar;
}
.main {
	grid-area: main;
}
.footer {
	grid-area: footer;
}
```

每一行的区域名称数量必须一致，同名区域必须组成矩形；`.` 表示空单元格。

### 5. 自动放置

未明确指定位置的项目由自动放置算法处理：

```css
.container {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	grid-auto-flow: row; /* 默认：优先按行填充 */
}
```

`grid-auto-flow: column` 优先按列放置；增加 `dense` 会尝试用后续较小项目回填前面
的空洞，但可能让视觉顺序与 DOM 顺序不同，需要注意键盘和阅读顺序。

## 五、项目属性

| 属性                      | 作用                                                         |
| ------------------------- | ------------------------------------------------------------ |
| `grid-column-start/end`   | 指定列起止网格线                                             |
| `grid-row-start/end`      | 指定行起止网格线                                             |
| `grid-column`、`grid-row` | 起止网格线简写                                               |
| `grid-area`               | 区域名，或 `row-start / column-start / row-end / column-end` |
| `justify-self`            | 单个项目在区域内沿 inline axis 对齐                          |
| `align-self`              | 单个项目在区域内沿 block axis 对齐                           |
| `place-self`              | `align-self justify-self` 简写                               |
| `order`                   | 修改自动放置和视觉排列顺序                                   |

Grid item 可以占据同一网格区域形成重叠，层叠关系可用 `z-index` 控制：

```css
.card__image,
.card__overlay {
	grid-area: 1 / 1;
}

.card__overlay {
	z-index: 1;
	align-self: end;
}
```

## 六、完整场景

### 1. 无断点自适应卡片列表

```css
.cards {
	display: grid;
	/* min() 避免视口比最小卡片宽度还小时产生横向溢出 */
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
	gap: clamp(12px, 2vw, 24px);
}
```

### 2. 响应式页面区域

```css
.page {
	display: grid;
	grid-template-areas:
		'header'
		'main'
		'sidebar'
		'footer';
	gap: 16px;
}

@media (min-width: 768px) {
	.page {
		grid-template-columns: minmax(0, 1fr) 280px;
		grid-template-areas:
			'header header'
			'main sidebar'
			'footer footer';
	}
}
```

DOM 应保持有意义的阅读顺序，Grid 只负责视觉布局。

### 3. 标签与控件对齐的表单

```css
.form {
	display: grid;
	grid-template-columns: max-content minmax(0, 1fr);
	gap: 12px 16px;
	align-items: center;
}

.form__actions {
	grid-column: 2;
}
```

所有标签共享第一列，因此不同表单行可以自然对齐。

## 七、`subgrid`

普通嵌套 Grid 会建立自己的独立轨道；`subgrid` 允许子网格在指定轴上复用父网格的
轨道尺寸和网格线。

```css
.cards {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 16px;
}

.card {
	grid-row: span 3;
	display: grid;
	grid-template-rows: subgrid;
}
```

这样多个卡片内部的标题、内容、操作区可以沿父网格的行轨道对齐。`subgrid`
按轴启用，可以只继承行或只继承列；另一条轴仍可定义自己的轨道。

## 八、Grid 与 Flex 如何取舍

| 维度     | Grid                                 | Flex                            |
| -------- | ------------------------------------ | ------------------------------- |
| 布局模型 | 二维，同时处理行与列                 | 一维，重点处理一个主轴          |
| 驱动方式 | 结构驱动，先定义轨道                 | 内容驱动，先考虑项目尺寸和流动  |
| 跨行对齐 | 共享网格线，适合严格列对齐           | 每条 flex line 独立计算         |
| 放置能力 | 网格线、命名区域、跨行跨列、重叠     | 顺序排列、弹性伸缩、自动 margin |
| 典型场景 | 页面骨架、卡片矩阵、复杂表单、仪表盘 | 导航、按钮组、工具栏、媒体对象  |

判断过程：

1. 需求是否同时描述了行和列？是则优先 Grid。
2. 是否要求多行项目沿同一列线对齐？是则优先 Grid。
3. 是否只需沿一个方向排列并分配剩余空间？是则优先 Flex。
4. 是否只是因为“Grid 更新”就强行使用？不要；选择应由布局关系决定。

常见组合是：

```text
页面区域：Grid
└── 顶部工具栏：Flex
└── 卡片列表：Grid
    └── 单张卡片内部：Flex column
```

更完整的 Flex 尺寸算法与案例见 [CSS Flex 布局](flex布局.md)。

## 九、常见陷阱

### 1. Grid 只直接作用于子元素

孙元素不会自动成为当前 Grid 的 item。需要它参与父级轨道时，应调整 DOM、让中间
元素使用 `display: contents`（同时评估语义和可访问性），或使用 `subgrid`。

### 2. `1fr` 仍可能被长内容撑开

`1fr` 轨道的自动最小值可能受 `min-content` 限制。常用
`minmax(0, 1fr)`，同时给真正溢出的 item 设置 `min-width: 0` 和合适的
`overflow`、`overflow-wrap`。

### 3. `auto-fit` 不等于固定列数

它根据容器可用空间和轨道最小值决定列数。如果业务要求固定四列，应直接使用
`repeat(4, 1fr)`，再通过容器查询或媒体查询改变列数。

### 4. 视觉重排不能替代源码顺序

网格线放置、命名区域、`order` 和 `dense` 都可能改变视觉顺序，但不应破坏合理的
DOM 阅读和键盘焦点顺序。

### 5. Grid 不是 HTML 表格的替代语义

Grid 负责表现层二维布局；具有行列数据关系的内容仍应使用语义化的 `<table>`。

### 6. 百分比轨道和 gap 可能溢出

例如 `50% 50%` 已占满容器，再增加 `gap` 就可能超出。等分列通常使用 `1fr 1fr`
更合适。

## 十、常见追问

### 如何一行代码实现 Grid 居中？

```css
.container {
	display: grid;
	place-items: center;
}
```

`place-items` 是 `align-items` 与 `justify-items` 的简写。

### `auto-fit` 为什么会让项目变宽？

空轨道会折叠，其空间重新进入可分配空间；`1fr` 会让已有项目扩展。`auto-fill`
保留空轨道，通常不会以相同方式拉伸已有项目。

### 为什么常见“12 列网格”？

12 可以被 2、3、4、6 整除，便于组合常见比例，但不是 Grid 的技术要求。现代 CSS
也可以直接按内容和业务区域定义轨道，不必机械套用 12 列。

### `subgrid` 和普通嵌套 Grid 有什么区别？

普通嵌套 Grid 独立计算自己的轨道；`subgrid` 在启用的轴上复用父级轨道，从而让
不同子组件的内部内容跨组件对齐。

## 参考规范

- [CSS Grid Layout Module Level 2](https://drafts.csswg.org/css-grid/)
- [CSS Box Alignment Module](https://drafts.csswg.org/css-align/)
