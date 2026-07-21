# NestJS 核心概念

> 你的采集服务实战见
> [13-项目深挖/住建部企业资质采集服务.md](../13-项目深挖/住建部企业资质采集服务.md)
>
> **作为前端候选人，面试官问 NestJS 通常是想验证
> "你说的独立做后端是不是真的"，所以重点是能讲清架构思想，
> 而不是背 API。**

## 为什么是 NestJS 而不是 Express/Koa

- **Express/Koa 只给你一个 HTTP 中间件框架**，
  项目结构、依赖注入、模块划分全靠自己约定 →
  团队一大就发散
- **NestJS 提供了架构约束**：模块化、依赖注入、装饰器、
  分层（Controller / Service / Repository）
- 对**从前端转过来的人友好**——
  TypeScript 优先，装饰器写法和 Angular 很像
- 生态完整：微服务、GraphQL、队列、定时任务、
  Swagger 都有官方集成

---

## 依赖注入（DI）

**这是 NestJS 最核心的概念，必须能讲清"为什么需要"。**

```ts
@Injectable()
export class OrderService {
  constructor(
    private readonly repo: OrderRepository,   // 自动注入
    private readonly mailer: MailerService,
  ) {}
}
```

**解决什么问题**：
1. **解耦**——OrderService 不需要知道 repo 怎么创建的
2. **可测试**——测试时可以注入 mock 实现
3. **生命周期管理**——容器统一管理单例/请求级实例

**作用域（scope）**：
- `DEFAULT`（单例，默认）——整个应用共享一个实例
- `REQUEST`——每个请求新建（性能开销大，慎用）
- `TRANSIENT`——每次注入都新建

> **单例是默认的，所以 Service 里不能存请求相关的状态**——
> 这和前端的 Zustand 在 SSR 下跨请求污染是同一类问题。

---

## 模块系统

```ts
@Module({
  imports: [OtherModule],      // 依赖的其他模块
  controllers: [OrderController],
  providers: [OrderService],    // 本模块内可注入的
  exports: [OrderService],      // 允许其他模块使用
})
export class OrderModule {}
```

**关键点**：
`providers` 里的东西**默认只在本模块内可见**，
要给别人用必须 `exports`——这是模块边界的体现。

---

## 请求生命周期（顺序题）

```
请求
 → 中间件 Middleware
 → 守卫 Guard          （鉴权：能不能访问）
 → 拦截器 Interceptor（前）
 → 管道 Pipe           （参数校验和转换）
 → 控制器 Controller → Service
 → 拦截器 Interceptor（后）  （统一响应格式）
 → 异常过滤器 Exception Filter
响应
```

**各自的职责别混**：
- **Guard**——鉴权（返回 true/false）
- **Pipe**——校验和转换入参（配合 `class-validator`）
- **Interceptor**——AOP，统一日志/响应格式/超时
- **Filter**——统一异常处理

---

## 为什么用 Fastify 而不是默认的 Express

- Fastify 的 **JSON 序列化基于 schema 编译**，吞吐明显高于 Express
- 内置 schema 校验，和 TS 类型配合好
- 纯服务端项目，**没有 Express 中间件生态的历史包袱**

**⚠️ 反问陷阱**：「那你实测提升多少？」
如果没测过，**诚实说没做基准对比**，
是基于社区数据和无历史包袱做的默认选择。
**硬编数字是自杀。**

---

## TypeORM 的常见坑

- **N+1 查询**——关联查询没用 `relations` 或 `leftJoinAndSelect`
- **批量插入性能**——几万条要分批 chunk，
  必要时走原生 SQL；`save()` 会逐条触发钩子
- **同步 schema 千万别在生产开**（`synchronize: true` 会改表结构）
- **事务**——用 `QueryRunner` 或 `@Transaction`，
  注意事务里的 repository 必须用同一个 manager

---

## 如果被问"为什么不用 Java/Spring"

**这题你很可能被问，因为你们公司有 Java 团队。**

**诚实且有理有据**：

> 这个服务的核心是采集和任务编排，
> 用到的是 Playwright 和队列，
> 这两块在 Node 生态里是一等公民——
> Playwright 本身就是 Node 优先的。
>
> 另外我自己是前端出身，TypeScript 上手成本最低，
> 从 0 到 1 的速度快很多。
>
> 如果是重事务、重计算的核心业务系统，
> 我会推荐用团队已有的 Java 栈，
> 因为运维和人力都在那边。**选型要看团队而不只看技术。**

**最后那句是关键**——显示你不是"什么都想用自己喜欢的技术"。
