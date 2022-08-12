# XSS、CSRF 以及如何防范

在 web 安全领域中，XSS 和 CSRF 是最常见的 攻击方式

## XSS（Cross Site Script）

XSS 即跨站脚本攻击，浏览器向服务器请求的时候注入脚本攻击



### 类型

1. 反射型（非持久型）
2. 存储型（持久型）
3. DOM型



### 防御

1. 输入过滤
2. 输出转译
3. 使用 httpOnly 锁死 cookie



## CSRF（Cross-site request forgety）

跨站请求伪造，黑客通过网站B，诱使用户去访问已经登录了的网站A，进行一些违背用户意愿的请求

### 防御

1. 验证 HTTP Referer
2. 再请求地址中添加 token 并验证
3. 加验证码