# CSS 层叠与选择器权重

## 面试速答

“哪个 CSS 声明生效”不能只看选择器权重。浏览器会先过滤不适用的规则，再依次比较：

1. 来源和重要性，例如过渡、`!important`、作者样式和浏览器默认样式。
2. Shadow DOM 等封装上下文、元素内联样式和层叠层 `@layer`。
3. 选择器特异性 specificity。
4. `@scope` 的作用域接近度。
5. 源码出现顺序，完全打平时后声明获胜。

只有前面的条件相同时，才轮到后面的条件。选择器特异性用 `(A, B, C)` 逐列比较：

- `A`：ID 选择器数量。
- `B`：类、属性、伪类选择器数量。
- `C`：类型选择器、伪元素数量。

不能把它简单理解为“ID 100、类 10、标签 1”后相加，因为再多的类也不会进位成
一个 ID。现代选择器中，`:where()` 恒为零；`:is()`、`:not()`、`:has()` 取参数
中的最高特异性；`:nth-child(... of S)` 还要加上自身这一份伪类权重。

## 一、完整层叠顺序

### 1. 先过滤不相关声明

选择器没有匹配、属性不适用于当前元素，或 `@media`、`@supports`、容器查询等条件
不成立的声明，不进入后续竞争。

### 2. 比较来源与重要性

从高到低：

| 优先级 | 来源                          |
| ------ | ----------------------------- |
| 1      | 正在生效的 CSS Transition     |
| 2      | 用户代理（UA）的 `!important` |
| 3      | 用户样式的 `!important`       |
| 4      | 作者样式的 `!important`       |
| 5      | 正在生效的 CSS Animation      |
| 6      | 作者普通样式                  |
| 7      | 用户普通样式                  |
| 8      | 用户代理普通样式              |

日常业务 CSS 基本处于“作者样式”来源，但要知道：

- 用户 `!important` 高于作者 `!important`，这是为用户可访问性保留的控制能力。
- Animation 高于作者普通声明，但低于任何来源的 `!important`。
- Transition 在生效期间位于更高层，甚至可以暂时覆盖 `!important` 的属性值。

### 3. 再比较同一来源内部的上下文

规范还会处理 Shadow DOM 的封装上下文。对普通声明，外层上下文优先；对
`!important` 声明顺序反转，让组件内部的重要约束可以得到保护。

同一来源、同一重要性下，直接附着在元素上的 `style` 声明高于通过选择器匹配的样式
规则。因此内联普通样式会压过作者样式表里的普通声明，但会输给作者
`!important`。

### 4. 比较 `@layer`

普通声明的层顺序：

```css
@layer reset, base, components, utilities;
```

- 越晚声明的 layer 优先级越高。
- 未放入任何显式 layer 的普通样式处在隐式最后层，高于所有显式 layer。
- 不同 layer 先比较层顺序，不看选择器特异性。

```css
@layer reset {
	#app button {
		color: gray;
	}
}

button {
	color: blue;
}
```

尽管 `#app button` 的特异性更高，未分层的 `button` 仍获胜，因为普通未分层样式
的层优先级更高。

`!important` 会反转 layer 顺序：

- 最早的显式 layer 中的 important 声明优先级最高。
- 显式 layer 的 important 声明高于未分层的 important 声明。

这种反转可以保护 reset、基础约束和用户覆盖，避免后引入的代码轻易破坏早期的重要
规则。

### 5. 最后才是特异性、作用域接近度和源码顺序

进入同一来源、重要性、上下文和 layer 后：

1. 特异性更高的选择器获胜。
2. 特异性相同时，`@scope` 根离当前元素更近的规则获胜。
3. 仍相同时，源码中后出现的声明获胜。

## 二、特异性三元组

| 选择器 | 计入列 | 示例                               |
| ------ | ------ | ---------------------------------- | --- | --- |
| ID     | A      | `#app`                             |
| 类     | B      | `.button`                          |
| 属性   | B      | `[disabled]`                       |
| 伪类   | B      | `:hover`、`:first-child`、`:scope` |
| 类型   | C      | `button`、`article`                |
| 伪元素 | C      | `::before`、`::selection`          |
| 通配符 | 不计入 | `*`                                |
| 组合符 | 不计入 | 空格、`>`、`+`、`~`、`             |     | `   |

示例：

```css
#app .item                    /* (1, 1, 0) */
.page .list > .item:hover    /* (0, 4, 0) */
main#app .item[data-x]::before
                              /* (1, 2, 2) */
ul > li::marker              /* (0, 0, 3) */
*                            /* (0, 0, 0) */
```

比较时从左到右逐列判断：

```text
(1, 0, 0) > (0, 100, 100)
(0, 2, 0) > (0, 1, 99)
```

因此“1000、100、10、1 相加法”只是一种容易误导的记忆方式。特异性没有十进制
进位，重复同一个简单选择器也确实会增加对应列，但工程上不应使用
`.button.button.button` 人为抬权重。

### 内联 style 怎么算？

规范把 style attribute 作为独立的层叠步骤处理，而不是普通选择器。教学中有时写成
四元组 `(inline, ID, class, type)`，例如 `(1, 0, 0, 0)`，可以帮助记忆，但要知道
它不属于 Selectors 规范定义的 `(A, B, C)` 三元组。

## 三、现代函数伪类的权重

### `:where()`：整个函数恒为零

```css
:where(#app, .page, article).button ;
.button/* :where(...) = (0, 0, 0)，总计 (0, 1, 0) */;
```

无论参数里有多少 ID、类或标签，`:where()` 本身及参数都不贡献特异性。

适用场景：

```css
:where(.prose) :where(h1, h2, h3) {
	margin-block: 1em 0.5em;
}
```

它能表达结构限制，又让业务类很容易覆盖基础样式。

### `:is()`：取参数列表中的最高值

```css
:is(.card, #preview).title ;
.title/* max((0, 1, 0), (1, 0, 0)) + (0, 1, 0) = (1, 1, 0) */;
```

即使当前元素是通过 `.card` 分支匹配，参数列表中的 `#preview` 仍会把整个
`:is()` 的特异性提高到 ID 级别。

### `:not()`：自身不额外计数，取最高参数

```css
button: not(.secondary, #danger);
/* button (0, 0, 1) + max((0, 1, 0), (1, 0, 0)) = (1, 0, 1) */
```

不要按旧知识把 `:not()` 一律算作普通伪类；现代规则由它的参数决定。

### `:has()`：自身不额外计数，取最高参数

```css
.card: has(> img.cover, > #video);
/* .card (0, 1, 0) + max((0, 1, 1), (1, 0, 0)) = (1, 1, 0) */
```

参数中的组合符不计分，真正贡献权重的是 `img.cover` 或 `#video`。

### `:nth-child(... of S)`：自身 + 参数最高值

```css
:nth-child(even)
/* (0, 1, 0) */

:nth-child(even of li, .item)
/* :nth-child (0, 1, 0) + max(li, .item) = (0, 2, 0) */

:nth-child(-n + 3 of .item, #featured)
/* (0, 1, 0) + (1, 0, 0) = (1, 1, 0) */
```

同样的规则也适用于 `:nth-last-child(... of S)`。

### `:scope`

显式写出的 `:scope` 是普通伪类，贡献 `(0, 1, 0)`。但 `@scope (...)` 前导部分
用于确定作用域根，不会自动加到内部选择器的特异性中。

## 四、伪元素和 Shadow DOM 相关规则

伪元素计入 C 列：

```css
.button::before /* (0, 1, 1) */
```

Shadow DOM 中常见规则：

- `:host` 按伪类计入 B 列。
- `:host(...)` 除 `:host` 自身外，参数也会贡献特异性。
- `:host-context(...)` 同样是“一份伪类 + 参数”的特异性。
- `::slotted(...)` 是“一份伪元素 + 参数”的特异性。
- `::part(name)` 按一份伪元素计入 C 列，part 名称本身不是类或 ID。

不能把所有函数选择器都套用 `:is()` 的规则，应先查对应伪类或伪元素的定义。

面试中如果题目不涉及 Web Components，不必为了显得“全面”主动展开 Shadow DOM；
但遇到相关代码时，应先确认选择器属于伪类还是伪元素。

## 五、`@scope` 与作用域接近度

```css
@scope (.article) {
	p {
		color: green;
	}
}

@scope (.comments) {
	p {
		color: blue;
	}
}
```

如果某个 `p` 同时处于嵌套的两个 scope 内，并且前面的层叠条件和特异性相同，离它
更近的 scope 根获胜。

需要区分：

- `@scope (.article)` 中 `.article` 只负责找到作用域根，不计入内部 `p` 的权重。
- 内部显式写 `:scope p` 时，`:scope` 自身会贡献 `(0, 1, 0)`。
- 作用域接近度在特异性之后、源码顺序之前比较。

因此 `@scope` 能提供局部覆盖能力，而不必给每条选择器拼接高权重的父级类或 ID。

## 六、CSS Nesting 的权重

原生嵌套选择器 `&` 的特异性等于父规则选择器列表中的最高特异性，行为类似
`:is()`：

```css
.card,
#dialog {
	& .title {
		color: blue;
	}
}
```

父选择器列表最高是 `#dialog` 的 `(1, 0, 0)`，再加 `.title`：

```text
& .title = (1, 1, 0)
```

即使某个元素实际通过 `.card .title` 匹配，这条嵌套规则仍使用父列表的最高值，
不能按手工展开后的 `.card .title = (0, 2, 0)` 计算。

降低嵌套父级权重可以显式使用 `:where()`：

```css
:where(.card, #dialog) {
	& .title {
		/* 总权重只有 .title 的 (0, 1, 0) */
	}
}
```

## 七、`!important` 的正确理解

`!important` 不是给选择器“三元组加一个无限大数字”，而是把声明放到更高的重要性
层级。比较过程是：

1. 先比较不同来源的 important 规则。
2. 在同一来源中按封装上下文、内联样式、layer 等继续比较。
3. 前面都相同时，才比较选择器特异性。

```css
.button {
	color: red !important;
}

#app .button {
	color: blue;
}
```

红色获胜，因为作者 important 声明高于作者普通声明，ID 权重没有机会参与比较。

但以下说法也不对：“任何 `!important` 都是最高优先级”。用户或 UA important、
层叠层反转、Shadow DOM 上下文以及正在生效的 Transition 都可能改变结果。

适合使用 important 的少数情况包括：

- 必须保护的可访问性或工具类约束，并且团队已定义好层叠层边界。
- 覆盖无法修改且带内联样式的第三方代码。
- 某些由外部脚本反复写入 style attribute 的集成场景。

不要把它作为常规组件覆盖手段。

## 八、继承不参与特异性竞争

```css
#parent {
	color: red;
}

p {
	color: blue;
}
```

```html
<div id="parent">
	<p>最终是蓝色</p>
</div>
```

`#parent` 虽然有 ID，但它匹配的是父元素；`p` 直接匹配当前元素。当前元素存在胜出的
直接声明后就不再使用继承值，因此不能说“父元素的 ID 权重更高”。

只有当前元素没有得到该属性的指定值时，可继承属性才从父元素获取计算值。

## 九、综合判断题

### 题 1：内联普通样式和作者 important

```html
<button class="button" style="color: red">按钮</button>
```

```css
.button {
	color: blue !important;
}
```

结果是蓝色。重要性先于元素内联样式步骤。

### 题 2：高权重低层与低权重未分层样式

```css
@layer components {
	#app .button {
		color: red;
	}
}

.button {
	color: blue;
}
```

结果是蓝色。普通未分层样式的 layer 优先级更高。

### 题 3：`:where()` 包含 ID

```css
.page: where(#app, .content) button;
```

权重是 `(0, 1, 1)`：`.page` 贡献 B，`button` 贡献 C，`:where()` 全部为零。

### 题 4：`:is()` 包含 ID

```css
.page: is(#app, .content) button;
```

权重是 `(1, 1, 1)`：`:is()` 取 `#app` 的 ID 权重。

### 题 5：同权重 scoped rule

两个规则来源、重要性、layer、特异性都相同且都匹配当前元素时，scope 根更近的规则
获胜；距离仍相同才看源码顺序。

### 题 6：Transition 与 important

某属性正在过渡时，过渡生成的当前值处于层叠顺序顶层，可以在过渡期间覆盖 important
声明；过渡结束后重新由普通层叠结果决定。

## 十、工程中的推荐策略

1. 用 class、属性和原生状态伪类表达组件与状态，避免 ID 参与常规样式。
2. 使用 `@layer reset, vendor, base, components, utilities, overrides` 明确覆盖边界。
3. 把第三方样式放入较低 layer，比堆叠高权重选择器更容易维护。
4. 基础样式和组件库公共约束使用 `:where()` 主动降低特异性。
5. 控制嵌套深度，尤其注意父选择器列表中的 ID 会通过 `&` 抬高整组规则。
6. 只有必要时才用 `!important`，并在注释中说明它保护的约束。
7. 可用 `revert-layer` 撤销当前 layer 的影响，而不是猜测前一层的具体值。

排查覆盖问题时按层叠顺序查看浏览器 DevTools：

```text
规则是否匹配、条件是否成立
→ 来源与 !important
→ Shadow DOM / 内联 style
→ @layer
→ specificity
→ @scope 接近度
→ 源码顺序
→ 是否其实来自继承
```

## 参考规范

- [Selectors Level 4：特异性](https://drafts.csswg.org/selectors/#specificity-rules)
- [CSS Cascading and Inheritance Level 5：层叠层](https://drafts.csswg.org/css-cascade-5/)
- [CSS Cascading and Inheritance Level 6：作用域接近度](https://drafts.csswg.org/css-cascade-6/)
- [CSS Nesting Module Level 1：嵌套选择器权重](https://drafts.csswg.org/css-nesting/)
- [CSS Shadow Module Level 1：Shadow DOM 选择器权重](https://drafts.csswg.org/css-shadow-1/)
