# CSS 选择器与继承

## 面试速答

CSS 选择器用于匹配需要应用样式的元素，常见类型包括：

- 基础选择器：通配、类型、类、ID、属性选择器。
- 关系选择器：后代、子代、相邻兄弟、后续兄弟。
- 伪类：描述元素结构、状态或关系，如 `:hover`、`:nth-child()`、`:has()`。
- 伪元素：选择元素的一部分或生成的抽象元素，如 `::before`、`::selection`。

现代 CSS 中重点掌握 `:is()`、`:where()`、`:not()`、`:has()`、
`:nth-child(... of ...)`、`:focus-visible`、`:scope` 和原生 CSS Nesting。
它们的匹配能力与权重规则不是一回事，权重详见
[CSS 层叠与选择器权重](css选择器权重.md)。

## 一、基础选择器

| 类型       | 示例                                | 含义                      |
| ---------- | ----------------------------------- | ------------------------- | ---------------------- |
| 通配选择器 | `*`、`svg                           | \*`                       | 匹配指定范围内所有元素 |
| 类型选择器 | `button`、`article`                 | 按元素名称匹配            |
| 类选择器   | `.item`                             | 匹配具有某个 class 的元素 |
| ID 选择器  | `#app`                              | 匹配指定 ID               |
| 属性选择器 | `[disabled]`、`[data-state="open"]` | 按属性存在性或值匹配      |

一个复合选择器可以同时包含多种条件：

```css
button.button[data-variant='primary']:not([disabled]) {
	/* 同时满足四个条件 */
}
```

## 二、属性选择器

| 写法               | 含义                                      |
| ------------------ | ----------------------------------------- |
| `[attr]`           | 存在该属性                                |
| `[attr="value"]`   | 值完全相等                                |
| `[attr~="value"]`  | 空格分隔的单词列表中包含该值              |
| `[attr\|="zh"]`    | 等于 `zh` 或以 `zh-` 开头，常用于语言代码 |
| `[attr^="prefix"]` | 以前缀开头                                |
| `[attr$=".pdf"]`   | 以后缀结尾                                |
| `[attr*="part"]`   | 包含子字符串                              |

可以在值匹配后增加大小写标志：

```css
[data-state='OPEN' i] {
	/* i 表示在 ASCII 范围内忽略大小写 */
}
```

`s` 表示区分大小写，但使用前仍应结合目标浏览器和属性本身的语义判断。

## 三、关系选择器

| 名称           | 示例            | 匹配对象                        |
| -------------- | --------------- | ------------------------------- |
| 后代组合符     | `.list .item`   | `.list` 内任意层级的 `.item`    |
| 子代组合符     | `.list > .item` | `.list` 的直接子元素 `.item`    |
| 相邻兄弟组合符 | `h2 + p`        | 紧跟在 `h2` 后的第一个 `p` 兄弟 |
| 后续兄弟组合符 | `h2 ~ p`        | `h2` 后面所有同级 `p`           |

组合符只描述元素关系，自身不增加选择器特异性。

## 四、伪类与伪元素

### 常见伪类

| 类别       | 示例                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| 用户操作   | `:hover`、`:active`、`:focus`、`:focus-visible`、`:focus-within`       |
| 表单状态   | `:enabled`、`:disabled`、`:checked`、`:required`、`:valid`、`:invalid` |
| 文档结构   | `:root`、`:empty`、`:first-child`、`:last-child`、`:nth-child()`       |
| 链接和资源 | `:link`、`:visited`、`:any-link`、`:defined`                           |
| 弹层状态   | `:modal`、`:popover-open`                                              |

`:focus-visible` 让浏览器根据输入方式等启发式规则决定是否显示焦点提示，通常比
直接移除 `outline` 更符合键盘可访问性。

### 常见伪元素

```css
.button::before {
	/* 生成的前置伪元素 */
}
p::first-line {
	/* 第一行 */
}
input::placeholder {
	/* 占位文本 */
}
::selection {
	/* 用户选中的文本 */
}
```

现代语法使用双冒号 `::` 区分伪元素和伪类。`::before`、`::after` 等因历史兼容
通常也接受单冒号，但新代码应使用双冒号。

## 五、现代逻辑与关系选择器

### 1. `:is()`：合并相同结构

```css
:is(article, section, aside) :is(h1, h2, h3) {
	line-height: 1.2;
}
```

它可以减少重复选择器，但权重取参数列表中最高的那一项：
`:is(.card, #preview)` 会引入 ID 级特异性。

### 2. `:where()`：零权重的结构约束

```css
:where(article, section, aside) a {
	color: var(--link-color);
}
```

`:where()` 的匹配能力与 `:is()` 类似，但函数本身及全部参数的特异性都为零。
它适合 reset、组件默认样式和希望业务方容易覆盖的库样式。

### 3. `:not()`：排除条件

```css
.button:not([disabled], .is-loading) {
	cursor: pointer;
}
```

Selectors Level 4 允许传入选择器列表以及更复杂的选择器。`:not()` 自身不额外
增加一份伪类权重，最终取参数中最高特异性。

### 4. `:has()`：根据相对关系选择当前元素

```css
/* 选择直接包含错误提示的字段 */
.field:has(> .error) {
	border-color: red;
}

/* 选择后面紧跟选中项的 li */
li:has(+ li.is-selected) {
	border-block-end-color: transparent;
}
```

它经常被称为“父选择器”，但能力更准确地说是：根据相对于当前元素的后代、子代或
兄弟关系进行匹配。`:has()` 不能嵌套另一个 `:has()`；伪元素默认也不能作为其参数，
除非未来某个伪元素规范明确允许。

### 5. 如何选 `:is()` 和 `:where()`

- 希望参数也参与权重计算，用 `:is()`。
- 只想表达结构条件、希望调用方容易覆盖，用 `:where()`。
- 不要为了缩短代码无意间把 ID 放进 `:is()`，否则整组选择器权重都会升高。

## 六、现代结构选择器

### `:nth-child(An+B of S)`

```css
/* 在可见行中交替着色，隐藏行不参与计数 */
tr:nth-child(even of :not([hidden])) {
	background: #f6f7f9;
}
```

`of S` 会先用选择器 `S` 过滤兄弟元素，再从过滤结果中按 `An+B` 计数。这与：

```css
tr:not([hidden]):nth-child(even)
```

不同；后者先按所有兄弟的位置计数，再检查当前行是否可见。

常用 `An+B`：

- `odd` 等价于 `2n + 1`，匹配奇数项。
- `even` 等价于 `2n`，匹配偶数项。
- `-n + 3` 匹配前三项。
- `n + 4` 匹配从第四项开始的所有项。

### `:scope`

`:scope` 表示当前选择上下文的根。在 `element.querySelector()` 中通常对应调用查询
的元素，在 `@scope` 中对应作用域根：

```js
container.querySelectorAll(':scope > .item');
```

```css
@scope (.card) {
	:scope {
		border: 1px solid;
	}

	> .title {
		font-weight: 600;
	}
}
```

## 七、原生 CSS Nesting

现代 CSS 可以直接嵌套样式规则，不等同于 Sass 在构建期进行的纯文本展开：

```css
.card {
	padding: 16px;

	> .title {
		font-weight: 600;
	}

	&:hover {
		box-shadow: 0 4px 16px rgb(0 0 0 / 12%);
	}

	@media (width >= 48rem) {
		padding: 24px;
	}
}
```

- `&` 表示父规则匹配到的元素。
- 以组合符开头的嵌套选择器隐含 `&`，如 `> .title`。
- `&` 的特异性取父规则选择器列表中的最高值，行为类似 `:is()`，不能总按手工展开
  后的某一条选择器计算。

更详细的计算示例见 [CSS 层叠与选择器权重](css选择器权重.md#六css-nesting-的权重)。

## 八、Shadow DOM 相关选择器

| 选择器                | 作用                                       |
| --------------------- | ------------------------------------------ |
| `:host`               | 在 Shadow DOM 样式中选择当前宿主元素       |
| `:host(...)`          | 宿主满足给定条件时匹配                     |
| `:host-context(...)`  | 宿主或其跨 Shadow 边界的祖先满足条件时匹配 |
| `::part(name)`        | 从外部选择组件显式暴露的 part              |
| `::slotted(selector)` | 在 shadow tree 内选择分配到 slot 的元素    |

它们不会让普通 CSS 任意穿透 Shadow DOM。组件必须通过 part、slot、自定义属性等
明确设计可定制边界。

## 九、选择器匹配与工程实践

浏览器可概念性地从复合选择器最右侧的关键选择器开始找候选元素，再检查祖先或兄弟
关系，但现代引擎会做大量索引和优化。工程中通常不应为了微小、未经测量的匹配性能
牺牲可读性，更重要的是：

- 选择器能清楚表达组件边界和状态。
- 避免依赖脆弱的 DOM 层级，如 `.page > div:nth-child(2) > span`。
- 状态优先使用语义类、属性或原生状态伪类，如 `[aria-expanded="true"]`。
- 库和基础样式使用 `:where()` 保持低权重。
- 不用 ID 和层层嵌套制造难以覆盖的高特异性。

## 十、属性继承

文本相关属性如 `color`、`font-family`、`font-size`、`line-height` 通常继承；
盒模型属性如 `margin`、`padding`、`border`、`width` 通常不继承。
是否继承由每个属性的规范定义，不能只凭“看起来像文字属性”猜测。

通用关键字：

| 关键字         | 含义                                                 |
| -------------- | ---------------------------------------------------- |
| `inherit`      | 强制使用父元素的计算值                               |
| `initial`      | 使用属性在规范中的初始值                             |
| `unset`        | 可继承属性表现为 `inherit`，其他属性表现为 `initial` |
| `revert`       | 回退到较低层叠来源中的结果                           |
| `revert-layer` | 回退当前层叠层，让前一层结果重新参与                 |

继承值不与直接匹配元素的声明比较特异性。只要元素自身有一个最终胜出的声明，就先
使用该声明；没有时才进入继承或初始值流程。

## 参考规范

- [Selectors Level 4](https://drafts.csswg.org/selectors/)
- [CSS Nesting Module Level 1](https://drafts.csswg.org/css-nesting/)
- [CSS Shadow Module Level 1](https://drafts.csswg.org/css-shadow-1/)
