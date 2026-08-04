# NestJS 核心概念

NestJS 在 Node.js HTTP 适配器之上提供模块、依赖注入和统一的请求处理机制。它适合需要明确边界、多人协作和长期维护的 TypeScript 服务；小型脚本或极简接口不一定需要这层框架约束。

## 模块与依赖注入

```ts
@Injectable()
export class OrderService {
	constructor(private readonly repository: OrderRepository) {}
}

@Module({
	controllers: [OrderController],
	providers: [OrderService, OrderRepository],
	exports: [OrderService]
})
export class OrderModule {}
```

- `providers` 注册可由容器创建和注入的对象。
- `exports` 显式暴露给导入该模块的其他模块。
- 构造器注入让依赖可替换，便于单元测试和实现解耦。
- 默认作用域是单例，服务中不应保存某个请求的可变状态。

常见作用域：

| 作用域      | 生命周期     | 适用情况                               |
| ----------- | ------------ | -------------------------------------- |
| `DEFAULT`   | 应用级单例   | 无请求状态的大多数服务                 |
| `REQUEST`   | 每个请求创建 | 确实需要请求级上下文，且能接受额外开销 |
| `TRANSIENT` | 每次注入创建 | 每个消费者需要独立实例                 |

## 循环引用

先区分三类问题：

1. 模块循环：`AModule` 和 `BModule` 互相 `imports`；
2. Provider 循环：`AService` 和 `BService` 互相注入；
3. 文件循环：内部文件通过 `index.ts` 桶文件反向导入，形成隐式环。

遇到 `Nest can't resolve dependencies` 或 `imports` 中出现 `undefined` 时，先检查导入路径、Provider 所属模块是否 `exports`、使用方是否 `imports`，以及桶文件循环。缺少导出不等于必须增加反向依赖。

### 优先调整依赖方向

如果两个模块共享独立能力，把该能力抽成第三个边界清晰的模块：

```text
AModule ──→ SharedCapabilityModule ←── BModule
```

如果真正的问题是跨多个服务的业务流程，由上层编排服务同时依赖它们：

```text
CoordinatorService
  ├──→ TaskService
  └──→ TokenService
```

不要为了消除循环，把两个模块的大量业务代码都塞进一个巨大的 `CommonModule`。如果反向调用只是通知任务完成、状态变化或触发后续异步处理，可以发布事件；需要立即拿返回值的请求-响应调用仍应保留显式依赖，不要强行事件化。

### 无法拆开时使用容器机制

模块互相引用时，两侧通过延迟闭包引用对方：

```ts
@Module({
	imports: [forwardRef(() => BModule)]
})
export class AModule {}
```

Provider 也互相注入时，还需要在注入点处理：

```ts
constructor(
	@Inject(forwardRef(() => BService))
	private readonly bService: BService
) {}
```

`forwardRef()` 让 Nest 延迟解析引用，但不会消除职责耦合，双方实例的创建顺序也不应被依赖。`ModuleRef` 可以在运行阶段获取 Provider，适合动态 Provider、插件或特殊生命周期；常规代码中它会隐藏真实依赖，通常不如构造器注入清楚。

### 40 秒面试回答

> 我先区分模块互相导入、Provider 互相注入和 `index.ts` 造成的文件循环。首选是调整职责和依赖方向：公共能力抽成独立模块，跨服务流程放到编排层，只用于通知的反向调用改成事件。确实拆不开时，模块两侧使用 `forwardRef()`，Provider 循环再配合 `@Inject(forwardRef(...))`，特殊动态依赖才考虑 `ModuleRef`。这些 API 解决的是容器加载问题，不等于解决了架构耦合。

参考：[NestJS Circular dependency](https://docs.nestjs.com/fundamentals/circular-dependency)

## 请求生命周期

一个典型请求大致按以下顺序处理：

```text
Middleware
  → Guard
  → Interceptor（进入）
  → Pipe
  → Controller / Service
  → Interceptor（返回）
  → Response
```

未捕获异常会跳转到异常过滤器。全局、控制器和路由级组件还各有执行顺序；返回阶段的拦截器按后进先出执行，过滤器则从最接近路由的位置向外查找。因此上图适合记整体方向，不能替代精确的局部顺序。

| 机制             | 主要职责                           | 不宜承担的职责       |
| ---------------- | ---------------------------------- | -------------------- |
| Middleware       | 通用请求预处理、挂载上下文         | 依赖路由元数据的授权 |
| Guard            | 判断是否允许访问                   | 修改业务返回值       |
| Pipe             | 参数转换与校验                     | 全局异常兜底         |
| Interceptor      | 调用前后逻辑、日志、超时、响应映射 | 代替领域服务         |
| Exception Filter | 将未处理异常映射为响应             | 吞掉错误而不记录     |

## Express 与 Fastify 适配器

Nest 默认使用 Express，也可以切换到 Fastify。选择时应基于基准测试、生态兼容性和团队维护成本：

- Fastify 强调 schema 驱动的校验与序列化，可能在特定负载下获得更高吞吐。
- Express 的中间件生态和团队熟悉度通常更广。
- 不能把 TypeScript 类型当成运行时校验；无论使用哪个适配器，都要显式校验外部输入。
- 性能结论必须用接近真实业务的数据、插件和部署方式实测，不能只引用空框架跑分。

## 数据访问与事务

以 TypeORM 为例，常见风险包括：

- 关联数据逐条加载导致 N+1 查询；应检查生成 SQL，并按场景使用 join、批量查询或 DataLoader。
- 大批量写入直接调用实体级 `save()` 可能产生额外查询和钩子开销；需要分批并评估 QueryBuilder 或数据库原生批量能力。
- 生产环境不应依赖 `synchronize: true` 自动修改表结构，应使用可审计、可回滚的 migration。
- 事务内的所有查询必须使用同一个事务管理器；可使用 `DataSource.transaction()` 或 `QueryRunner` 明确边界。
- 不要在数据库事务中执行慢网络请求，否则会延长锁持有时间。

## 选型边界

NestJS、Spring 等框架没有脱离场景的优劣。常见评估维度包括：

1. 团队已有语言与运维体系；
2. 一致性、吞吐、延迟和计算特征；
3. 依赖生态和招聘维护成本；
4. 监控、部署与故障恢复能力；
5. 迁移成本和长期所有权。

I/O 密集、TypeScript 团队主导的服务可能适合 Node.js；重计算任务应使用 Worker Threads、独立进程或专门计算服务，避免阻塞事件循环。

## 复习检查

- 能解释依赖注入解决了什么问题，而不只会写装饰器。
- 能说清 Guard、Pipe、Interceptor 和 Filter 的边界。
- 知道请求级作用域和长事务的成本。
- 能用约束和测量结果说明选型，不使用“某框架一定更快”的结论。
