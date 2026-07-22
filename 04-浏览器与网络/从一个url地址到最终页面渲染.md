# 从输入 URL 到页面可交互

## 1. 解析 URL 与命中本地机制

浏览器先解析协议、主机、端口和路径，可能命中 HTTP 缓存、Service Worker 或 HSTS
升级规则。导航也可能被扩展、企业代理或安全策略拦截。

## 2. DNS 与连接

未命中可复用连接时解析 DNS。随后根据协议建立传输连接：

- HTTP/1.1、HTTP/2 通常基于 TCP；HTTPS 还要 TLS 握手。
- HTTP/3 基于 QUIC，把传输与 TLS 1.3 握手结合。

浏览器会复用 keep-alive 连接；不会在每个请求结束后都立刻四次挥手。

## 3. 发送 HTTP 请求并接收响应

请求包含方法、路径、头部和可选 body。浏览器处理重定向、认证、Cookie、缓存和内容编码。
收到 HTML 后通常会流式解析，不必等整个响应下载完才开始构建 DOM。

## 4. 解析 HTML 与发现子资源

- HTML parser 构建 DOM。
- preload scanner 可提前发现样式、脚本、图片等资源。
- CSS 解析为 CSSOM；样式表通常阻塞渲染，也会影响依赖样式的脚本执行。
- 普通同步 script 会阻塞 HTML 解析；`defer`、`async`、module 的时序不同。

## 5. 渲染流水线

DOM 和 CSSOM 参与生成渲染相关结构，浏览器随后进行样式计算、布局、绘制和合成。
这些步骤会增量、交错执行，不是只在页面结束时线性跑一次。

JavaScript 修改 DOM/CSS 后可能再次触发样式或布局；`transform`、`opacity` 等动画
在满足条件时可主要由合成阶段处理。

## 6. 生命周期与可交互

- DOM 解析完成且 defer/module 脚本执行后触发 `DOMContentLoaded`。
- 页面依赖资源完成后触发 `load`，但懒加载和异步请求还可能继续。
- “可交互”应结合 INP、长任务和业务 hydration/初始化判断，不等同于 `load`。

这道题回答时应根据追问深入 DNS、TLS、HTTP 缓存或渲染，不必一口气背完所有细节。
