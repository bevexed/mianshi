# XSS、CSRF 及防御

## XSS（跨站脚本）

XSS 是不可信数据被浏览器当作可执行 HTML/JavaScript 解释。它不一定发生在请求阶段。

| 类型   | 说明                                          |
| ------ | --------------------------------------------- |
| 存储型 | 恶意内容进入数据库，之后展示给其他用户        |
| 反射型 | 恶意输入从当前请求反射到响应                  |
| DOM 型 | 前端把 URL、消息等不可信数据写入危险 DOM sink |

### 防御

1. **按输出上下文编码**：HTML、属性、URL、JavaScript 字符串的编码规则不同。
   React/Vue 文本插值默认转义，但 `dangerouslySetInnerHTML` / `v-html` 不会。
2. 确实要渲染富文本时，用可靠 sanitizer 并配置允许列表；“输入过滤几个关键词”不够。
3. 使用 CSP 限制脚本来源，优先 nonce/hash，减少内联脚本；CSP 是纵深防御，不替代转义。
4. Cookie 使用 HttpOnly 可降低令牌被直接读取的风险，但 XSS 仍能以用户身份发请求。
5. 避免 `eval`、字符串形式 `setTimeout`、不可信 URL 注入等危险 sink。

## CSRF（跨站请求伪造）

攻击者诱导已登录用户的浏览器向目标站发送请求；浏览器可能自动携带 Cookie，
而服务端没有验证请求是否来自受信任交互。

### 防御

1. Cookie 设置合适的 `SameSite=Lax/Strict`；确需跨站时再使用 `None; Secure`。
2. 对有副作用的请求校验 CSRF token（同步 token 或 double-submit 等模式）。
3. 校验 `Origin`，必要时以 `Referer` 兜底；不能只依赖可能缺失的 Referer。
4. GET/HEAD 保持无副作用，敏感操作要求重新认证或用户确认。
5. 自定义请求头会触发 CORS 预检，可增加攻击门槛，但不能替代服务端鉴权和 CSRF 设计。

## 两者关系

- XSS 利用“站点执行了攻击者脚本”。
- CSRF 利用“浏览器自动携带身份凭据”。
- XSS 往往可以绕过页面内的 CSRF token，因此根治 XSS 仍是关键；
  但没有 XSS 不代表不需要 CSRF 防护。
