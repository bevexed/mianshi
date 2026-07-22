# React Server Components 与水合

## Server Component vs Client Component

|          | Server Component                         | Client Component           |
| -------- | ---------------------------------------- | -------------------------- |
| 运行位置 | **只在服务端**运行                       | 服务端预渲染 + 客户端水合  |
| 能做     | 直接读数据库/文件、用密钥                | 用 hooks、事件、浏览器 API |
| 不能做   | `useState`/`useEffect`/事件处理          | 直接访问服务端资源         |
| 打包体积 | **不进 JS bundle**                       | 进 bundle                  |
| 默认     | App Router 里**默认是 Server Component** | 需要 `'use client'`        |

### 为什么 Server Component 可以减少 JS

**最关键的一句**：

> RSC 的核心收益是**把组件代码本身从客户端 bundle 里去掉**。
>
> 一个用 markdown 解析库渲染的服务端组件，
> 那个库**根本不会下发给浏览器**——
> 这是 SSR 做不到的（SSR 只是把渲染提前，代码照样下发）。

---

## `'use client'` 的边界传染

**这题很多人答错，答对很加分。**

- `'use client'` 标记的是**客户端模块图的入口边界**——
  从这个文件通过 `import` 可达的模块会成为客户端模块图的一部分
- 所以要**把 `'use client'` 尽量往叶子节点推**，
  而不是图省事加在页面顶层（那样整棵树都变成客户端组件，RSC 收益归零）

### 关键模式：用 children 保住 RSC 收益

```tsx
// Server Component：在服务端组合两者
export default function Page() {
	return (
		<Accordion>
			<HeavyServerContent />
		</Accordion>
	);
}

// Accordion.tsx 是 Client Component，但 children 由服务端创建
('use client');
export function Accordion({ children }) {
	/* ... */
}
```

**原理**：Server Component 可以通过 `children` prop 传给 Client Component，
交互壳是客户端的、内容仍是服务端的。

关键是不要在 Client Component 中直接 import Server Component；
由上层 Server Component 完成组合，再把服务端结果作为 prop 传入。

---

## 水合（Hydration）不匹配

**必须有具体案例，泛泛而谈会被识破。**

### 典型成因

**1. 服务端和客户端渲染出的 HTML 不一致**
最常见是用了 `Date.now()`、`Math.random()`、
`new Date().toLocaleString()`（时区不同）

**2. 访问了只有浏览器有的东西**
`window` / `localStorage`，服务端渲染时是 undefined，客户端又有值

**3. 第三方脚本改了 DOM**
浏览器插件、翻译插件注入节点

**4. HTML 嵌套非法**
比如 `<p>` 里套 `<div>`，浏览器会自动纠正结构，导致对不上

### 解决手段

| 手段                                         | 适用                                           |
| -------------------------------------------- | ---------------------------------------------- |
| `useEffect` 里再设置只有客户端才有的状态     | 大多数情况（首屏渲染一致，之后再更新）         |
| `suppressHydrationWarning`                   | **只用于确实无法避免的**，如时间戳。不是万金油 |
| `dynamic(() => import(...), { ssr: false })` | 完全不该 SSR 的组件（如依赖 window 的图表库）  |
| **把状态源改成 cookie**                      | 登录态场景的根本解法                           |

### 登录态是水合问题的重灾区

服务端不知道用户登没登录（如果 token 在 localStorage），
客户端从 localStorage 读到了，一渲染就不匹配。

**根本解法**：token 存 **httpOnly cookie**，
服务端能直接读到，两边渲染结果一致。

> 关联：[04-浏览器与网络/认证方案对比.md](../../04-浏览器与网络/认证方案对比.md)

---

## RSC 的数据获取

```tsx
// Server Component 里直接 await，不需要 useEffect
export default async function Page() {
	const data = await fetch('...').then((r) => r.json());
	return <List data={data} />;
}
```

**优势**：

- 可以减少一部分客户端往返，并在服务端并行组织数据依赖
- 可用 Suspense/Streaming 统一组织 loading UI
- 密钥不暴露

**限制**：

- Server Component 里**不能用 hooks**
- 数据变化后要刷新得靠 `revalidatePath` / `router.refresh()`
- **交互性数据仍然需要 react-query 之类的客户端方案**

RSC 不会自动消除数据瀑布；如果组件在 `await` 后才渲染下层，
下层请求仍可能串行。应尽早启动独立请求，并用组合与 Suspense 拆开边界。

---

## Server Component 能传什么给 Client Component

**只能传可序列化的值**：

- ✅ 基本类型、数组、对象、Date、Map、Set、Promise
- ❌ **函数**（除了 Server Actions）、class 实例、Symbol

这个限制经常被问——因为 RSC 的输出要通过网络传给客户端，
必须能序列化。
