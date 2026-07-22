# Next.js 旧版 Server Actions 与 Middleware

> 归档原因：Next.js 16 将 `middleware` 约定重命名为 `proxy`，
> 且 Proxy 使用 Node.js runtime。本文关于文件名和 Edge Runtime 的说法已过时。
> 当前内容见
> [Server Actions 与 Proxy](../05-React生态/Next.js/ServerActions与Proxy.md)。

## Server Actions 是什么

**在客户端调用、在服务端执行的函数**，
不需要手写 API 路由。

```tsx
// app/actions.ts
'use server';

export async function createOrder(formData: FormData) {
	const title = formData.get('title');
	await db.order.create({ data: { title } });
	revalidatePath('/orders'); // 顺便让缓存失效
}

// 组件里直接用
<form action={createOrder}>
	<input name="title" />
	<button>提交</button>
</form>;
```

### 它解决了什么

- 省掉「写 API route → 前端 fetch → 处理响应」这一整套样板
- **渐进增强**——JS 没加载完时表单也能提交（浏览器原生 form 行为）
- 和 `useActionState` / `useOptimistic` 配合，
  pending 和乐观更新都是现成的

### 安全注意事项（面试重点）

**Server Action 本质是一个自动生成的 HTTP 端点**，
任何人都能构造请求调用它。所以：

- **必须在 action 内部做鉴权**——不能假设"只有登录用户的页面才能调它"
- **必须校验入参**——客户端传来的一切都不可信
- 不要把敏感逻辑的判断放在调用方

```ts
'use server'
export async function deleteOrder(id: string) {
  const session = await auth()                    // ✅ 必须验
  if (!session) throw new Error('Unauthorized')
  if (!isValidId(id)) throw new Error('Bad input') // ✅ 必须校验
  ...
}
```

**这题答不好会被认为安全意识不足**——
和「前端算折扣但后端不校验」是同一类问题。

---

## Middleware 做什么

**在请求到达路由之前运行**，跑在 Edge Runtime 上。

```ts
// middleware.ts
export function middleware(req: NextRequest) {
	const token = req.cookies.get('token');
	if (!token) return NextResponse.redirect(new URL('/login', req.url));
	return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };
```

### 典型用途

| 用途              | 说明                                                |
| ----------------- | --------------------------------------------------- |
| **鉴权重定向**    | 未登录跳登录页——**在页面渲染前拦截，不会闪一下**    |
| **国际化路由**    | 按 `Accept-Language` 或 cookie 重写到 `/zh` / `/en` |
| **A/B 测试**      | 按用户分流重写到不同页面                            |
| **改请求/响应头** | 加安全头、CSP                                       |
| **地域限制**      | 按 IP 归属重定向                                    |

### 限制（常被追问）

- 跑在 **Edge Runtime**，**不能用 Node.js API**
  （`fs`、原生数据库驱动都不行）
- **不能做重活**——它在每个匹配请求上都跑，
  慢了会拖累所有页面的 TTFB
- 体积有限制

**所以数据库查询这类事不该放 Middleware**，
只做轻量的 cookie / header 判断和重定向。

---

## 和你项目的关联

【需确认】你官网项目里：

- 登录鉴权是用 Middleware 做的，还是在页面里判断的？
- 有没有用 Server Actions？还是仍然走传统 API + react-query？

**这两个问题的答案会决定面试官往哪个方向追问**，
提前想清楚。如果没用 Server Actions，
可以说「我们后端是独立的 Java/NestJS 服务，
Next.js 只做 BFF 层，所以直接调后端 API 更直接，
没有引入 Server Actions」——**这是完全合理的架构选择**，
不用为了新特性而用新特性。
