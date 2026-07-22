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
