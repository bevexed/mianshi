# WebSocket

WebSocket 在一次 HTTP/1.1 Upgrade 握手（HTTP/2/3 也有扩展连接机制）后建立持久、
全双工的消息通道，服务端可以主动推送。

```js
const socket = new WebSocket('wss://example.com/ws');

socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'ping' })));
socket.addEventListener('message', (event) => {
	const message = JSON.parse(event.data);
	handleMessage(message);
});
socket.addEventListener('close', () => scheduleReconnect());
```

## 和其他方案比较

| 方案      | 方向                     | 适合场景                                     |
| --------- | ------------------------ | -------------------------------------------- |
| 短轮询    | 客户端定时请求           | 更新很少、实现成本优先                       |
| 长轮询    | 服务端暂不返回直到有数据 | 兼容旧环境                                   |
| SSE       | 服务端 → 客户端          | 通知、日志、AI 流式文本；自动重连、基于 HTTP |
| WebSocket | 双向                     | 聊天、协同编辑、游戏、双向实时控制           |

## 生产边界

- `wss` 只保证传输加密，业务仍要做认证、授权、消息 schema 校验和限流。
- 浏览器 WebSocket API 不能像 fetch 一样随意设置 `Authorization` header；
  常见做法是同站 Cookie、短期 ticket 或应用层首条认证消息，避免长期 token 暴露在 URL 日志里。
- 要设计心跳、断线重连、指数退避、消息幂等和服务端背压。
- 浏览器构造 WebSocket 不受 CORS 预检控制，但会发送 `Origin`，服务端必须校验。
- Socket.IO 是带事件、重连和降级能力的上层协议/库，不等同于原生 WebSocket。
