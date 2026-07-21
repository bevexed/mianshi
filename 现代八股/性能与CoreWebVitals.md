# 性能优化与 Core Web Vitals

> 仓库 `性能/` 目录有 7 篇，但都是 2022 年的通用论述
> （「什么是性能优化」「加载优化」），**没有一篇讲 Core Web Vitals 的具体指标**。
> 现在面试问性能基本都从 LCP/CLS/INP 切入，这篇补这块。

---

## 一、指标体系

### Q1：Core Web Vitals 是哪三个？

| 指标 | 全称 | 衡量什么 | 好 | 需改进 | 差 |
|---|---|---|---|---|---|
| **LCP** | Largest Contentful Paint | **加载**：最大内容元素渲染完成 | ≤2.5s | 2.5-4s | >4s |
| **INP** | Interaction to Next Paint | **响应**：交互到下一帧绘制 | ≤200ms | 200-500ms | >500ms |
| **CLS** | Cumulative Layout Shift | **视觉稳定**：意外布局偏移累积分 | ≤0.1 | 0.1-0.25 | >0.25 |

**⚠️ 关键更新**：**INP 在 2024 年 3 月已经正式取代 FID**
成为 Core Web Vitals 之一。如果你还答 FID，会暴露知识停在几年前。

**其他常用指标**：
- **FCP**（First Contentful Paint）——首次内容绘制
- **TTFB**（Time to First Byte）——服务器响应速度
- **TBT**（Total Blocking Time）——实验室里 INP 的替代指标

### Q2：为什么 FID 被 INP 取代？

- FID 只测**第一次交互的输入延迟**，而且只测「延迟」不测「处理完成」
- 结果是：很多页面 FID 很好看，但用户实际点按钮后卡半天——
  因为卡在处理和渲染阶段，FID 测不到
- **INP 测的是整个交互周期**（输入延迟 + 处理时间 + 下一帧绘制），
  且取的是**整个会话中接近最差的那次**，更接近真实体验

---

## 二、LCP

### Q3：LCP 慢，怎么排查和优化？

**排查顺序（按耗时构成拆解）**：
```
LCP = TTFB + 资源加载延迟 + 资源加载时间 + 元素渲染延迟
```
先用 DevTools / Lighthouse 看哪一段占大头，再对症下药。

**优化手段（按收益排序）**：

1. **TTFB**——服务端响应慢
   - CDN、SSR 缓存、ISR、数据库慢查询
2. **资源发现要早**
   - LCP 图片**别用懒加载**（很多人一刀切给所有图加 `loading="lazy"`，
     首屏图也懒加载了，直接拖垮 LCP）
   - 用 `<link rel="preload">` 或 `fetchpriority="high"` 提前
   - **避免 LCP 图片藏在 JS 里**——如果图片 URL 要等 JS 执行才知道，
     浏览器的预扫描器就发现不了它
3. **资源本身要小**
   - WebP/AVIF、响应式 `srcset`、合适的压缩率
4. **渲染不被阻塞**
   - 减少阻塞渲染的 CSS/JS，关键 CSS 内联
   - 字体用 `font-display: swap` 避免文字不可见

### Q4：Next.js 里 LCP 的特殊坑？

**这题和你的官网项目直接相关：**
- **入场动画杀 LCP**——如果主视觉初始 `opacity: 0`，
  等 framer-motion 动画才显现，**LCP 会被推迟到动画执行时**。
  首屏元素不应该依赖 JS 动画才可见
- **`next/image` 的 `priority`**——首屏图必须加 `priority`，
  它会自动 preload 并关闭懒加载
- **Client Component 过多**——`'use client'` 边界太靠上会导致
  大量 JS 下发和水合，拖慢交互

---

## 三、CLS

### Q5：CLS 是什么？怎么优化？

**定义**：页面加载过程中**元素意外位移**的累积分数
（影响面积比例 × 位移距离比例）。典型场景是你正要点按钮，
上面的图片加载出来把按钮挤下去了。

**常见成因和修法**：

| 成因 | 修法 |
|---|---|
| 图片/视频没有尺寸 | 加 `width`/`height` 属性或 `aspect-ratio`，让浏览器提前占位 |
| 广告/嵌入内容动态插入 | 预留固定高度的容器 |
| 自定义字体加载导致重排（FOUT） | `font-display: optional/swap` + `size-adjust` 调整回退字体度量 |
| 动态插入的 banner/提示条 | 别插在已有内容上方；用 `position: fixed` 或预留空间 |
| 骨架屏尺寸和真实内容不一致 | 骨架屏要按真实尺寸做 |

**注意**：由用户交互（500ms 内）引起的位移**不计入** CLS——
比如用户点击展开手风琴，内容下移是预期行为。

---

## 四、INP / 运行时性能

### Q6：INP 差怎么优化？

**根因通常是主线程被长任务阻塞**：
- **拆分长任务**——超过 50ms 的任务要切分，
  用 `scheduler.yield()`（新 API）或 `setTimeout` 让出主线程
- **减少 hydration 成本**——SSR 页面在水合完成前是"看得见点不动"的
- **把重计算移出主线程**——Web Worker
- **React 特有**：用 `useTransition` 把非紧急更新降级（见 [React 篇](React专题.md) Q13）
- **事件处理器里别做重活**——先给用户即时反馈（改个 loading 态），
  重活放到下一帧

### Q7：React 页面越来越卡，怎么排查？

**这是场景题，见 [场景题](../场景题.md#三react-页面越来越卡) 的完整版**，
这里给要点：
1. **React DevTools Profiler** 录制，看哪些组件重渲染、渲染耗时多少
2. 开 **"Highlight updates when components render"**，
   直观看到哪些区域在无谓重渲染
3. 常见根因：
   - Context value 每次是新对象 → 所有消费者重渲染
   - 列表没做虚拟滚动，几千个 DOM 节点
   - 大量内联函数/对象导致 memo 失效
   - 定时器/订阅没清理，越积越多

### Q8：怎么定位内存泄漏？

1. **Performance 面板录制**，看 JS Heap 曲线——
   反复操作后内存持续上涨且 GC 后不回落，就是泄漏
2. **Memory 面板拍 heap snapshot**，操作几次后再拍，
   用 **Comparison 视图**看新增了哪些对象没被回收
3. **常见泄漏源**（前端）：
   - `setInterval` / 事件监听 / `IntersectionObserver` 没清理
   - 闭包持有大对象
   - 组件卸载后 setState（虽然 React 18 不再警告，但引用仍被持有）
   - 全局 Map/数组不断 push 却不清理（用 **WeakMap** 可缓解）
   - 微前端子应用卸载不彻底（**这是你的微前端场景要特别注意的**）

---

## 五、缓存与网络

### Q9：浏览器缓存怎么配？

**强缓存 vs 协商缓存**：
```
强缓存（不发请求）：
  Cache-Control: max-age=31536000, immutable
  （Expires 是 HTTP/1.0 的，已被 Cache-Control 取代）

协商缓存（发请求，可能返回 304）：
  ETag / If-None-Match
  Last-Modified / If-Modified-Since
```

**前端项目的标准配置**：
| 资源 | 策略 | 原因 |
|---|---|---|
| `index.html` | `no-cache`（每次协商） | 入口必须能立刻更新 |
| 带 hash 的 JS/CSS | `max-age=31536000, immutable` | 内容变了文件名就变，可永久缓存 |
| 图片/字体 | 长缓存 | 同上 |

**核心思路**：**入口不缓存，其余靠内容 hash 长缓存**。
这样发版时只有 html 需要重新拉，未变的资源全部命中缓存。

### Q10：CDN 怎么配？前端要注意什么？

- **回源策略**——CDN 未命中时回源站取，配好回源 Host 和缓存 key
- **发版后刷新**——新版本上线要刷 index.html 的 CDN 缓存，
  否则用户拿到旧入口
- **跨域头**——JS 资源要配 `Access-Control-Allow-Origin` 
  且脚本标签加 `crossorigin`，否则错误监控只能拿到 `Script error.`
  （见 [Sentry 篇](../简历深挖/Sentry私有化部署.md) Q9）
- **别把带用户信息的接口走 CDN 缓存**——会串号，这是事故级问题

---

## 六、答题策略

性能题最容易答成"背了一堆优化手段"。**加上这个框架会显得专业得多**：

> 我做性能优化的顺序是：**先定指标，再定位瓶颈，最后才谈手段**。
>
> 定指标是因为"页面卡"这种描述没法优化——
> 要先明确是首屏慢（LCP）、交互卡（INP）还是跳动（CLS），
> 三者的优化方向完全不同。
>
> 定位瓶颈用 Lighthouse 看整体、Performance 面板看长任务、
> React Profiler 看组件。**我的经验是不量就改，八成改错地方**——
> 我优化微信 H5 打包体积时就是先接了 visualizer 才发现大头在 react-pdf，
> 在那之前我以为是 antd-mobile。

**最后那个具体例子把方法论落地了，比纯讲流程可信。**
