# Server Actions 与 Proxy

> 版本边界：Next.js 16 将 `middleware.ts` 约定重命名为
> `proxy.ts`。维护旧版项目时仍会看到 Middleware，新项目应优先使用 Proxy 术语。

## Server Action 是什么

Server Action 是带 `'use server'` 标记、可由客户端交互触发的服务端函数。
它可以和 `<form action>`、`useActionState` 与缓存失效 API 配合，
但不是“无需安全边界的内部函数”。

```tsx
'use server';

export async function createOrder(_previous: State, formData: FormData) {
	const session = await auth();
	if (!session) return { error: '未授权' };

	const input = orderSchema.safeParse(Object.fromEntries(formData));
	if (!input.success) return { error: '参数不合法' };

	await db.order.create({ data: input.data });
	revalidatePath('/orders');
	return { ok: true };
}
```

### 安全清单

- 每个 Action 内都做身份认证与资源级授权，不信任页面是否对用户可见。
- 把 `FormData` 和其他客户端参数当作不可信输入，校验类型、长度与业务约束。
- 敏感操作增加 CSRF/来源校验、频率限制、审计和幂等性，具体按威胁模型决定。
- 只向客户端返回可公开数据，不把数据库错误或服务端秘密透出。

## Proxy 是什么

Proxy 在请求完成前运行，适合做轻量、请求边界的重定向、
重写和请求/响应头处理。

```ts
// proxy.ts
import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
	const session = request.cookies.get('session');
	if (!session) return NextResponse.redirect(new URL('/login', request.url));
	return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };
```

Next.js 16 的 Proxy 使用 **Node.js runtime**，不能沿用“Middleware 一定跑在 Edge”
的旧结论。但它仍处于高频请求路径，不宜放置慢查询、大型依赖或重 CPU 任务。

## 能力边界

| 需求                            | 选择                               |
| ------------------------------- | ---------------------------------- |
| 根据 cookie/header 重定向或重写 | Proxy                              |
| 在页面读取用户数据              | Server Component / 服务端数据层    |
| 处理表单变更                    | Server Action 或 Route Handler     |
| 为外部客户端提供公共 API        | Route Handler / 独立后端           |
| 最终的资源级授权                | 资源读写处再次校验，不只依赖 Proxy |

Proxy 能拦截导航，但不是最终授权层；Server Action 能减少样板代码，
但不必然替代独立 API。选型要看调用方、运行时与团队边界。
