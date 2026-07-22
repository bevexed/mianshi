# Fetch 和 Axios

## 核心差异

|                | Fetch                                                       | Axios                               |
| -------------- | ----------------------------------------------------------- | ----------------------------------- |
| 来源           | Web 平台标准 API；现代 Node 也提供                          | 第三方 HTTP 客户端                  |
| HTTP 4xx/5xx   | Promise **正常 fulfilled**，需检查 `response.ok`            | 默认按 `validateStatus` 拒绝        |
| 超时/取消      | `AbortController` / `AbortSignal.timeout()`（看运行时支持） | 支持 AbortSignal 和超时配置         |
| 拦截器         | 无内置，需要封装                                            | 内置请求/响应拦截器                 |
| JSON           | 手动 `response.json()`                                      | 默认转换常见 JSON 响应              |
| 浏览器上传进度 | 标准 Fetch 目前缺少通用上传进度事件                         | XHR adapter 可用 `onUploadProgress` |

```js
async function requestJSON(url, options = {}) {
	const response = await fetch(url, options);
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}
	return response.json();
}
```

Fetch 会在网络失败、CORS 阻止、显式 abort 等情况下拒绝；HTTP 404/500 本身不算网络失败。

## Cookie 默认值

Fetch 的 `credentials` 默认是 `same-origin`：同源请求会带凭据，跨源默认不带。
跨源携带 Cookie 要设置 `credentials: 'include'`，服务端 CORS 和 Cookie SameSite
属性也必须同时允许。

## Axios 的实现边界

Axios 在不同环境通过 adapter 工作：浏览器长期使用 XHR，也支持 Fetch adapter；
Node 端使用对应 HTTP 能力。因此“Axios 本质永远是 XHR 封装”已经不准确。

选型上，简单请求和希望少依赖时用 Fetch；需要统一拦截、成熟错误约定、
旧浏览器 XHR 上传进度或项目已有 Axios 基建时继续用 Axios。两者都需要自行设计
认证刷新、重试幂等、错误归一化和取消策略。
