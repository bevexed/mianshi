# 浏览器缓存与 CDN 配置

> 缓存的基础机制见 [04-浏览器与网络/浏览器缓存问题.md](../04-浏览器与网络/浏览器缓存问题.md)
> 和 [缓存技术.md](缓存技术.md)，本篇侧重**前端项目该怎么配**。

## 强缓存 vs 协商缓存

```
强缓存（不发请求，直接用本地）：
  Cache-Control: max-age=31536000, immutable
  （Expires 是 HTTP/1.0 的，已被 Cache-Control 取代）

协商缓存（发请求，可能返回 304）：
  ETag / If-None-Match           ← 内容哈希，精确
  Last-Modified / If-Modified-Since  ← 时间戳，秒级精度
```

**优先级**：`Cache-Control` > `Expires`，`ETag` > `Last-Modified`

---

## 前端项目的标准配置

| 资源 | 策略 | 原因 |
|---|---|---|
| **`index.html`** | `no-cache`（每次协商） | 入口必须能立刻更新 |
| **带 hash 的 JS/CSS** | `max-age=31536000, immutable` | 内容变了文件名就变，可永久缓存 |
| 图片/字体 | 长缓存 | 同上 |
| 接口响应 | 通常 `no-store` | 数据实时性 |

### 核心思路

> **入口不缓存，其余靠内容 hash 长缓存。**
>
> 这样发版时只有 `index.html` 需要重新拉，
> 未变的资源全部命中缓存——用户感知是"秒开"。

### `no-cache` 和 `no-store` 的区别（易混）

- **`no-cache`**——**可以缓存，但每次使用前必须去服务端验证**
  （走协商缓存，命中返回 304）
- **`no-store`**——**完全不缓存**，每次都完整下载

`index.html` 用 `no-cache` 而不是 `no-store`——
因为没更新时能返回 304，省流量。

---

## CDN 配置要点

### 回源策略
- CDN 未命中时回源站取，配好**回源 Host** 和**缓存 key**
- 缓存 key 要注意：带查询参数的 URL 是否算不同资源

### 发版后要刷新
新版本上线要**刷 `index.html` 的 CDN 缓存**，
否则用户拿到的还是旧入口，
引用的是已经被删掉的旧 hash 文件 → **白屏**。

> 这是最经典的发版事故之一，见 [12-场景题/发版安全.md](../12-场景题/发版安全.md)

### 跨域头
JS 资源要配 `Access-Control-Allow-Origin`
且脚本标签加 `crossorigin`，
否则错误监控只能拿到 `Script error.`。

> 见 [07-工程化/前端监控.md](../07-工程化/前端监控.md)

### ⚠️ 绝对不要做的事

**别把带用户信息的接口走 CDN 缓存**——
会串号（A 用户看到 B 用户的数据），**这是事故级问题**。

判断标准：响应内容是否因人而异。
因人而异的一律 `Cache-Control: private, no-store`。

---

## 灰度发布时的缓存问题

多版本并存时，用户可能拿到 v1 的 html 但请求 v2 的资源，
或者反过来。

**解法**：
- 旧版本的静态资源**保留一段时间**再删（至少一个发布周期）
- 前端做**资源加载失败的兜底**——
  chunk 加载失败时提示用户刷新页面
  ```js
  // Vite / Webpack 的动态导入失败
  window.addEventListener('vite:preloadError', () => location.reload())
  ```

**这个细节很能体现你真的经历过发版事故。**
