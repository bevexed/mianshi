# CSRF 与跨站请求防护

CSRF 利用浏览器会自动携带 Cookie、客户端证书等环境凭据，诱导已登录用户向目标站发起非预期操作。服务端如果只看到“有效会话”，却无法证明请求来自受信任交互，就可能执行伪造操作。

## 成立条件

通常同时满足以下条件才存在典型 CSRF 风险：

1. 身份凭据会被浏览器自动附加，而不是由受信任代码显式读取后放入 header；
2. 攻击者能构造浏览器可发送的请求；
3. 接口产生状态变化或敏感副作用；
4. 服务端没有可靠验证 token、请求来源或用户再次确认。

同源策略/CORS 主要限制攻击页面**读取响应**，不会普遍阻止 `<form>`、图片、导航等跨站发送请求。XSS 则能在目标站上下文内读取 token 并发起合法形态请求，因此可能绕过 CSRF 防线。

origin、简单请求和预检的完整规则见 [跨域与 CORS](../04-浏览器与网络/跨域.md)。

## 防护组合

| 控制                     | 作用与边界                                                     |
| ------------------------ | -------------------------------------------------------------- |
| 正确 HTTP 语义           | GET/HEAD/OPTIONS 不做状态变更，缩小可被导航触发的攻击面        |
| `SameSite` Cookie        | 限制部分跨站场景自动带 Cookie；same-site 不等于 same-origin    |
| CSRF token               | 证明页面拿到了攻击站无法读取的随机值，由服务端校验             |
| `Origin`/`Referer` 校验  | 对有副作用请求比较完整 origin；需定义缺失或 `null` 时的策略    |
| Fetch Metadata           | 利用 `Sec-Fetch-Site` 等信号拒绝明显的跨站敏感请求             |
| 用户交互/重新认证        | 转账、改密、增权等高风险操作再次确认，限制会话被动滥用         |

### Cookie 设置

```http
Set-Cookie: session=...; Secure; HttpOnly; SameSite=Lax; Path=/
```

- 能接受严格同站限制时使用 `SameSite=Strict`；需要跨站场景时才使用 `None; Secure`。
- `Lax` 仍允许部分顶层导航场景，不能容忍状态变更 GET。
- 不要默认设置宽泛 `Domain`。适用时使用 `__Host-` 前缀：要求 `Secure`、`Path=/` 且不带 `Domain`，可减少子域注入范围。
- 在 schemeful same-site 模型下，协议相同且共享可注册域的兄弟子域通常属于 same-site，但仍不是 same-origin；若其中有不可信租户或可被接管的子域，不能把 SameSite 当成唯一防线。

### Token 模式

- 有服务端会话状态：优先同步 token，绑定用户会话并用安全随机数生成。
- 无服务端状态：使用**签名且绑定会话**的 double-submit token；不要仅比较两个可被注入的同名值。
- token 放在表单字段或自定义 header 中，不放 URL；服务端缺失、错误或过期时拒绝请求。
- 优先使用框架自带、持续维护的 CSRF 机制，避免自创加密和比较逻辑。

### 来源与 Fetch Metadata

对写操作校验 `Origin` 与目标 origin 精确匹配，必要时再以 `Referer` 兜底；要考虑反向代理下协议/主机的可信解析。现代浏览器还会发送 `Sec-Fetch-Site`：可默认拒绝 `cross-site` 的非安全方法，并为 Webhook、受信任跨源 API 等建立显式例外。

旧客户端可能缺少 Fetch Metadata，因此敏感系统应结合 token 或标准来源校验，而不是只依赖一个 header。

## API、CORS 与客户端侧 CSRF

- 使用 `Authorization` header 且浏览器不会自动生成该值的 API，通常不符合经典 CSRF 前提；仍要防 XSS、令牌泄露和 CORS 配置错误。
- 携带 Cookie 的跨源 API 不能使用 `Access-Control-Allow-Origin: *`，允许源必须精确、可控，并正确设置 `Vary: Origin`。
- 自定义 header 会触发预检，但只有服务端严格限制允许源和 header 时才有意义。
- 前端若从 URL、消息等不可信输入拼接请求目标，再自动附加 CSRF token，可能形成“客户端侧 CSRF”；需要限制路径/动作允许列表。

## 验证清单

1. 枚举所有 POST/PUT/PATCH/DELETE，以及错误地有副作用的 GET。
2. 分别测试无 token、错误 token、其他会话 token、跨站 Origin、缺失 Origin 和重放。
3. 检查登录、登出、账号绑定、改密、支付、权限变更和上传等容易漏掉的入口。
4. 验证子域、跨域登录、嵌入式页面、旧客户端和代理部署不会意外绕过策略。
5. 对拒绝事件做采样告警，避免记录 token、Cookie 或完整敏感请求体。

## 权威参考

- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN SameSite cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies#controlling_third-party_cookies_with_samesite)
