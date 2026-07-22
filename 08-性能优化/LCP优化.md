# LCP 优化

## 先拆解耗时构成

```
LCP = TTFB + 资源发现延迟 + 资源加载时间 + 元素渲染延迟
```

**先用 DevTools / Lighthouse 看哪一段占大头，再对症下药。**
不拆解就优化 = 瞎改。

---

## 按收益排序的优化手段

### 1. TTFB（服务端响应慢）

- CDN 就近接入
- SSR 缓存 / ISR
- 数据库慢查询
- `preconnect` 提前完成 DNS + TCP + TLS 握手
  ```html
  <link rel="preconnect" href="https://cdn.example.com" />
  ```

### 2. 资源发现要早（最容易踩坑的一环）

**❌ LCP 图片别用懒加载**
很多人一刀切给所有图加 `loading="lazy"`，
把首屏主图也懒加载了，**直接拖垮 LCP**。

**✅ 提前声明优先级**

```html
<img src="hero.webp" fetchpriority="high" /> <link rel="preload" as="image" href="hero.webp" />
```

**❌ 避免 LCP 图片藏在 JS 里**
如果图片 URL 要等 JS 执行才知道（比如从接口拿），
浏览器的**预扫描器（preload scanner）就发现不了它**，
只能等 JS 跑完才开始下载。

### 3. 资源本身要小

- **WebP / AVIF** 替代 JPEG/PNG
- 响应式 `srcset` + `sizes`，别给手机发 2000px 宽的图
- 合适的压缩率（视觉无损即可）

### 4. 渲染不被阻塞

- 减少阻塞渲染的 CSS/JS
- **关键 CSS 内联**，其余异步加载
- 字体用 `font-display: swap` 避免文字长时间不可见

---

## Next.js 中的常见边界

### 入场动画杀 LCP

如果主视觉初始 `opacity: 0`，等 framer-motion 动画才显现，
**LCP 会被推迟到动画执行完**。

> **首屏元素不应该依赖 JS 动画才可见。**
> 要做入场效果，可以让元素初始就可见，只做位移/缩放；
> 或者用 CSS 动画而不是等 JS hydrate。

### `next/image` 的版本边界

Next.js 16 开始 `priority` prop 已废弃，改为语义更清晰的 `preload`。
只对确认的 LCP/主视觉图像使用：

```jsx
<Image src="/hero.png" preload width={1200} height={675} alt="产品主视觉" />
```

当不适合 preload（例如多张图可能随 viewport 成为 LCP）时，
可根据 Next.js 当前文档评估 `loading="eager"` 或 `fetchPriority="high"`，
不要同时滥用多种高优先级机制。

### Client Component 过多

`'use client'` 边界太靠上会增加客户端 JS 和水合工作。
它可能通过长任务、客户端才发现的资源或渲染延迟影响 LCP/INP，
应用时序数据确认，不要一律归因为“重排”。

> 关联：[05-React 生态/Next.js/RSC 与水合.md](../05-React生态/Next.js/RSC与水合.md)

---

## 怎么知道 LCP 元素是哪个

- Chrome DevTools → Performance 面板录制 → Timings 轨道里有 LCP 标记，
  点击能高亮具体元素
- Lighthouse 报告里直接列出 LCP element

也可以在代码里观察：

```js
new PerformanceObserver((list) => {
	const entry = list.getEntries().at(-1);
	console.log('LCP element:', entry.element);
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

**先确认 LCP 元素是什么，再谈优化**——
很多人优化了半天，结果 LCP 元素是一段文字而不是他一直在压缩的那张图。
