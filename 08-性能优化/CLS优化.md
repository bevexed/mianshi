# CLS（布局偏移）优化

## CLS 是什么

页面加载过程中**元素意外位移**的累积分数：

```
单次偏移分 = 影响面积比例 × 位移距离比例
CLS = 会话窗口内偏移分的最大值
```

**典型场景**：你正要点按钮，
上面的图片加载出来把按钮挤下去了，结果点到了别的东西。

---

## 常见成因和修法

| 成因 | 修法 |
|---|---|
| **图片/视频没有尺寸** | 加 `width`/`height` 属性或 `aspect-ratio`，让浏览器提前占位 |
| 广告/嵌入内容动态插入 | 预留固定高度的容器 |
| **自定义字体加载导致重排**（FOUT） | `font-display: optional/swap` + `size-adjust` 调整回退字体度量 |
| 动态插入的 banner/提示条 | 别插在已有内容上方；用 `position: fixed` 或预留空间 |
| 骨架屏尺寸和真实内容不一致 | 骨架屏要**按真实尺寸**做 |
| 异步数据回来后内容撑开 | 容器设 `min-height` |

---

## 图片占位的正确写法

```html
<!-- ✅ 有宽高属性，浏览器能算出宽高比预留空间 -->
<img src="a.jpg" width="800" height="600" style="width:100%;height:auto">

<!-- ✅ 或者用 aspect-ratio -->
<img src="a.jpg" style="aspect-ratio:4/3;width:100%">
```

**关键点**：即使 CSS 里宽度是 100%，
**HTML 的 width/height 属性仍然有用**——
现代浏览器用它们计算宽高比来预留空间。
很多人以为用了 CSS 就不用写属性了，这是错的。

`next/image` 强制要求宽高就是这个原因。

---

## 字体导致的偏移

**FOUT（Flash of Unstyled Text）**：
先用系统字体渲染，字体加载完后替换，
因为**度量不同导致文字重排**。

**解法**：
```css
@font-face {
  font-family: 'MyFont';
  src: url(...);
  font-display: swap;        /* 先显示回退字体，加载完替换 */
  size-adjust: 105%;         /* 调整回退字体大小，让度量接近 */
  ascent-override: 90%;      /* 进一步对齐基线 */
}
```

`font-display` 的取值：
- `swap`——立刻用回退字体，加载完换（有 FOUT，但文字不会不可见）
- `optional`——短暂等待，超时就永远用回退字体（**CLS 最优**）
- `block`——先隐藏文字（有 FOIT，文字空白，影响 LCP）

---

## 一个重要例外

**由用户交互（500ms 内）引起的位移不计入 CLS**——
比如用户点击展开手风琴，内容下移是**预期行为**。

所以：
- 需要展开/收起的交互，**放心做**
- 但如果动画超过 500ms 才产生位移，就会被计入

---

## 怎么定位是哪个元素在偏移

```js
new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      console.log('CLS:', entry.value, entry.sources.map(s => s.node))
    }
  }
}).observe({ type: 'layout-shift', buffered: true })
```

DevTools 里也可以：Performance 面板录制后，
在 Experience 轨道里能看到 Layout Shift 标记，点击高亮元素。
