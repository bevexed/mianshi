# XSS 与前端注入

XSS 的根因是**不可信数据被浏览器当成可执行的 HTML、JavaScript、CSS 或 URL 语义解释**。它不一定经过服务端，也不等同于“页面出现了 `<script>`”；真正要追踪的是 source 到危险 DOM sink 的数据流。

## 类型与数据流

| 类型   | 典型数据流                                               |
| ------ | -------------------------------------------------------- |
| 存储型 | 输入进入数据库、评论或配置，之后在其他用户页面执行       |
| 反射型 | 请求参数进入当次 HTML 响应并被解释                       |
| DOM 型 | URL、`postMessage`、存储等数据被前端写入危险 DOM sink    |

常见 source 包括 URL、表单、API 响应、富文本、第三方消息、`localStorage` 和跨窗口消息。常见危险 sink 包括 `innerHTML`、`outerHTML`、`insertAdjacentHTML`、`document.write`、内联事件属性、`eval`、`new Function` 和可执行 URL。

## 防护优先级

### 1. 使用安全 API 和框架默认转义

```js
title.textContent = untrustedValue;
link.setAttribute("href", validatedHttpUrl);
```

React/Vue 的文本插值通常会转义，但以下出口重新引入风险：

- React 的 `dangerouslySetInnerHTML`、Vue 的 `v-html`；
- 把不可信字符串交给模板编译器、动态脚本或 URL；
- 直接操作 DOM、第三方富文本/Markdown 渲染器或旧组件；
- 服务端渲染时手工拼 HTML，或把 JSON 放入脚本上下文却未安全序列化。

### 2. 按输出上下文编码

| 输出位置        | 处理原则                                                   |
| --------------- | ---------------------------------------------------------- |
| HTML 文本       | HTML 实体编码，或使用 `textContent`/框架文本插值           |
| HTML 属性       | 属性值加引号并做属性编码；属性名和事件属性不能由用户决定   |
| URL 参数        | 先限制协议/目标，再用 URL API 或 `encodeURIComponent`      |
| JavaScript/CSS  | 尽量不插入动态数据；不能把 HTML 编码误当 JS/CSS 编码       |

“入口统一替换尖括号”无法覆盖不同上下文，容易被编码差异绕过，还会破坏合法数据。输入校验负责业务合法性，**输出编码负责解释器边界**，两者不能互相替代。

### 3. 富文本使用允许列表净化

确实需要 HTML 时，使用持续维护的 sanitizer，并明确允许的标签、属性和协议。净化后不要再拼接或变换出新的危险内容；净化库和 DOM 实现也要及时升级。Markdown 转 HTML、SVG、MathML 和可点击 URL 都应纳入同一评审。

### 4. 用 CSP 和 Trusted Types 做纵深防御

```http
Content-Security-Policy: default-src 'self'; script-src 'nonce-{每次响应随机值}' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
```

- nonce 必须高熵、每次响应重新生成，且只加在可信脚本上；不能写成固定配置值。
- 先部署 `Content-Security-Policy-Report-Only` 观察，再逐步移除宽泛源、内联脚本和 `unsafe-eval`。
- CSP 限制漏洞影响，但不是输出编码或净化的替代品。
- 支持范围允许时，可用 `require-trusted-types-for 'script'` 约束部分 DOM XSS sink；旧浏览器仍需要原有防线。

## Cookie 与令牌边界

`HttpOnly` 能阻止 JavaScript 直接读取 Cookie，但 XSS 仍可能以用户身份发请求、读取页面数据或修改操作。因此“把 token 放 HttpOnly Cookie”只能降低一类窃取后果，不会修复 XSS。可读的长期 token 放在 Web Storage 中，一旦发生 XSS 更容易被导出并脱离浏览器重放。

## 常见误区

- WAF 或关键词黑名单无法可靠覆盖 DOM XSS、编码变体和业务数据流。
- CSP 中保留宽泛域名、`unsafe-inline`/`unsafe-eval` 会显著削弱保护。
- CORS 约束跨源读取，不会阻止当前站点执行已经注入的脚本。
- `innerText`/`textContent` 用于文本；把字符串转义后再交给 `innerHTML` 仍要确认上下文。
- 对 `postMessage` 只检查消息结构不够，还要校验 `event.origin` 和发送方关系。

## 验证清单

1. 搜索危险 sink，逐一追溯数据来源和中间转换。
2. 覆盖服务端渲染、客户端路由、富文本、错误页、预览页和后台管理端。
3. 用包含引号、标签边界、URL 协议和 Unicode 的测试数据验证“显示为数据而非代码”。
4. 在 CI 运行模板/lint/SAST 规则，并对允许使用危险 API 的位置要求显式封装和评审。
5. 收集 CSP 报告但去重、采样和脱敏，不能把报告端点变成新的泄密或 DoS 面。

## 权威参考

- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP DOM based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [MDN Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
