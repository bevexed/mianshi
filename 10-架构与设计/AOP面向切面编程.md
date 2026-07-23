# AOP 面向切面编程

AOP（Aspect-Oriented Programming，面向切面编程）用于把日志、指标、事务、缓存等会横跨多个业务模块的逻辑集中管理，再按明确规则应用到目标执行点。

它不是 GoF 设计模式，也不等于“使用了代理”或“写了装饰器”。代理、运行时拦截和编译期织入都是实现 AOP 的可能机制；AOP 更关注如何描述横切关注点、选择执行位置并组织附加行为。

## 为什么需要 AOP

如果每个业务方法都手写相同的计时、日志和异常上报，核心流程会被重复代码淹没：

下面省略领域类型和依赖的定义，只展示横切逻辑如何侵入核心流程：

```ts
async function createOrder(command: CreateOrderCommand) {
	const startedAt = performance.now();
	try {
		const result = await orderRepository.create(command);
		reportMetric('create_order_duration', performance.now() - startedAt);
		return result;
	} catch (error) {
		reportError(error);
		throw error;
	}
}
```

AOP 尝试把“创建订单”与“如何计时、记录和上报”分开，使横切逻辑能够统一配置和演进。代价是控制流变得更隐式，因此只适合边界稳定、规则统一的关注点。

## 核心术语

| 术语                                    | 含义                             | 示例                                   |
| --------------------------------------- | -------------------------------- | -------------------------------------- |
| **横切关注点**（cross-cutting concern） | 分散在多个模块中的共同需求       | 日志、指标、事务                       |
| **连接点**（join point）                | 程序执行过程中允许附加行为的位置 | 方法执行、方法调用、异常处理           |
| **切点**（pointcut）                    | 选择一组连接点的规则             | 选择所有标记了 `@Transactional` 的方法 |
| **通知**（advice）                      | 在选中连接点执行的附加逻辑       | 调用前鉴权、调用后记录耗时             |
| **切面**（aspect）                      | 切点与通知组成的模块             | “所有写接口的审计切面”                 |
| **目标对象**（target）                  | 原始业务逻辑所在的对象           | `OrderService`                         |
| **织入**（weaving）                     | 把切面应用到目标程序的过程       | 编译期、类加载期或运行时代理           |

连接点是“程序中发生的位置”，切点是“筛选这些位置的规则”，两者不能混为一谈。

## 通知的执行方式

| 类型            | 执行时机                         | 典型用途               |
| --------------- | -------------------------------- | ---------------------- |
| Before          | 目标执行前                       | 参数审计、前置校验     |
| After Returning | 目标成功返回后                   | 成功指标、返回值补充   |
| After Throwing  | 目标抛出异常后                   | 错误记录、异常转换     |
| After / Finally | 无论成功失败都执行               | 清理资源、记录耗时     |
| Around          | 包裹整个目标执行，可决定是否继续 | 缓存、事务、重试、超时 |

Around 通知能力最强，也最容易改变业务语义。如果没有调用原执行过程，目标逻辑可能完全不会运行；如果吞掉异常或重复调用，返回值、幂等性和事务语义都会变化。

执行链可以简化为：

```text
调用方
  → Around 通知（进入）
    → Before 通知
      → 目标方法
    → After Returning / After Throwing
  → Around 通知（退出）
```

多个切面同时命中时，顺序会影响结果。例如“事务外重试”和“事务内重试”具有不同的提交与回滚边界，必须显式规定优先级并用集成测试验证。

---

## TypeScript 中的最小示例

普通高阶函数可以表达 Around 通知的核心结构：

```ts
type AsyncMethod<TThis, TArgs extends unknown[], TResult> = (
	this: TThis,
	...args: TArgs
) => Promise<TResult>;

function withTiming<TThis, TArgs extends unknown[], TResult>(
	name: string,
	method: AsyncMethod<TThis, TArgs, TResult>,
	report: (name: string, duration: number) => void
): AsyncMethod<TThis, TArgs, TResult> {
	return async function (...args) {
		const startedAt = performance.now();
		try {
			return await method.apply(this, args);
		} finally {
			report(name, performance.now() - startedAt);
		}
	};
}
```

它保留原方法的参数、返回值、`this` 和异常，只在外围记录耗时：

```ts
class OrderService {
	async create(command: CreateOrderCommand) {
		return orderRepository.create(command);
	}
}

OrderService.prototype.create = withTiming(
	'OrderService.create',
	OrderService.prototype.create,
	reportMetric
);
```

这个例子展示了“环绕执行”，但还不是完整 AOP 框架：它没有通用切点语言、切面优先级、元数据发现和自动织入。真实项目更常使用框架拦截器、容器代理或构建期插件，而不是直接改写原型。

## 常见实现机制

### 1. 显式包装和高阶函数

调用方主动使用包装函数，控制流最容易追踪，适合请求客户端、埋点和少量服务函数。缺点是每个目标都要显式组装，无法自动匹配大范围连接点。

### 2. JavaScript `Proxy`

运行时代理可以拦截属性读取，再包装目标方法。它适合动态对象，但需要处理：

- 方法的 `this` 绑定；
- 同一方法多次读取时的包装函数身份；
- 私有字段、不可配置属性和代理不变量；
- 绕过代理直接持有目标对象时无法拦截；
- 调试栈、性能和类型声明。

`Proxy` 是一种语言机制，只有配合切点选择和统一通知管理时，才构成 AOP 风格的方案。

### 3. 装饰器与元数据

装饰器可以在类或方法定义阶段登记元数据，框架再根据元数据创建代理或拦截器。`@Transactional`、`@UseInterceptors()` 等写法常采用这种组合。

装饰器语法本身不等于 AOP。一个只修改字段默认值的装饰器没有横切语义；反过来，没有 `@` 语法也可以通过配置或命名规则应用切面。

### 4. 编译期或加载期织入

AspectJ 等工具可以在编译期或类加载期修改字节码，覆盖方法调用、方法执行、字段访问和构造器等更多连接点。能力比运行时方法代理强，但构建、调试和团队认知成本也更高。

---

## 不同框架中的落地

| 环境       | 常见机制                                  | 适合场景                     | 重要边界                                            |
| ---------- | ----------------------------------------- | ---------------------------- | --------------------------------------------------- |
| Spring AOP | JDK 动态代理或基于类的代理                | 事务、缓存、安全、审计       | 主要拦截经过代理的 Bean 方法调用                    |
| AspectJ    | 编译期或加载期织入                        | 需要更丰富连接点的 Java 应用 | 构建和调试复杂度更高                                |
| NestJS     | Interceptor 包裹路由处理器的 `Observable` | 日志、耗时、响应映射、缓存   | 主要位于请求处理边界，不会自动拦截任意 Service 调用 |
| 前端应用   | 请求拦截器、路由钩子、高阶函数、构建插件  | 监控、埋点、统一错误处理     | 多数只是局部 AOP 思想，不必包装成通用框架           |

### Spring AOP 的代理边界

Spring AOP 基于代理。调用方持有代理对象时，调用才会经过通知；目标对象内部的 `this.otherMethod()` 自调用直接落在原对象上，通常绕过代理。

还要注意：

- JDK 动态代理以接口为边界；基于类的代理通过生成子类工作。
- `final` 类不能被子类代理，`final` 和 `private` 方法不能依赖子类覆盖完成通知。
- 手动 `new` 出来的对象不由容器代理。
- 声明式事务同样受这些代理语义约束。

详见[Spring 核心概念](../16-后端常识/Spring核心概念.md#aop-与代理)。

### NestJS Interceptor 的边界

NestJS Interceptor 可以在路由处理器前后执行逻辑，也可以转换返回流、异常或直接阻止处理器执行。它体现 AOP 思想，但连接点主要由 Nest 请求生命周期定义。

- 鉴权是否允许访问通常交给 Guard。
- 参数转换和校验交给 Pipe。
- 未处理异常到响应的统一映射交给 Exception Filter。
- Interceptor 适合围绕处理器的日志、耗时、缓存和响应转换。

不要因为这些机制都属于“通用逻辑”，就把它们全部塞进一个全局 Interceptor。

---

## AOP 与相近概念的区别

| 概念              | 核心关注点                       | 与 AOP 的关系                                  |
| ----------------- | -------------------------------- | ---------------------------------------------- |
| 代理模式          | 控制对目标对象的访问             | 可以作为运行时 AOP 的底层机制                  |
| 装饰器模式        | 显式包装对象并叠加职责           | 结构与 Around 通知相似，但通常由调用方显式组合 |
| 语言装饰器        | 在声明阶段执行转换或登记元数据   | 可以触发 AOP，也可以只做普通元编程             |
| 中间件            | 在请求、消息等明确管道中依次执行 | 是显式管道；AOP 可按切点匹配更分散的连接点     |
| 观察者 / 发布订阅 | 事件发生后通知订阅方             | 通常不包裹原执行，也不能决定原逻辑是否继续     |
| 依赖注入          | 从外部提供对象依赖               | 可为切面提供依赖，但解决的问题不同             |

真实框架可能同时使用多种机制。例如声明式事务会用注解提供元数据、容器创建代理、事务拦截器实现 Around 通知。

## 适合与不适合的场景

**适合集中处理**：

- 统一日志、指标、链路追踪和审计；
- 事务边界、缓存读取与失效；
- 有明确范围和脱敏规则的异常上报；
- 针对幂等操作、暂时性故障的受控重试；
- 框架请求边界上的超时和响应转换。

**应保留在显式业务流程中**：

- 订单能否取消、价格如何计算等核心领域规则；
- 每个场景差异很大的校验和授权判断；
- 需要调用方明确感知的副作用；
- 顺序复杂、频繁例外的业务编排。

权限是横切关注点，但“是否登录”“是否有接口权限”和“当前订单是否允许该用户操作”属于不同层次。前两者可由统一机制处理，最后一项通常应留在领域服务中显式表达。

## 风险与检查清单

1. **切点是否足够精确**：命名匹配或全局拦截很容易误伤无关方法。
2. **顺序是否明确**：日志、缓存、重试、事务的嵌套顺序会改变语义。
3. **是否保留原契约**：不要意外吞异常、改变返回类型或重复执行非幂等操作。
4. **是否存在绕过路径**：自调用、直接持有目标对象或手动创建实例可能绕过代理。
5. **异步上下文是否可靠**：trace ID、事务和请求上下文不一定自动跨线程或任务传播。
6. **日志是否脱敏**：切面覆盖范围广，更容易批量泄露令牌和个人数据。
7. **是否可观测和可测试**：应能看出哪些切面命中、按什么顺序执行，并分别测试业务与切面。
8. **失败策略是否清楚**：指标上报失败通常不应阻断业务，事务或鉴权失败则不能忽略。

## 面试回答方式

可以用四步回答：

1. AOP 解决横切关注点散落和重复的问题。
2. 切点选择连接点，通知定义附加行为，切面把二者组织起来。
3. Spring 常用运行时代理，AspectJ 可以织入字节码，NestJS Interceptor 只覆盖框架定义的请求处理边界。
4. AOP 会隐藏控制流，必须关注代理绕过、执行顺序、异常语义和过宽切点。

一句话总结：

> AOP 适合把稳定、统一的技术性横切逻辑移到业务边界之外；核心业务规则仍应显式可读。

## 参考资料

- AspectJ Programming Guide：[Join Points and Pointcuts](https://eclipse.dev/aspectj/doc/released/progguide/language-joinPoints.html)
- AspectJ Programming Guide：[Advice](https://eclipse.dev/aspectj/doc/released/progguide/semantics-advice.html)
- Spring Framework Reference：[Proxying Mechanisms](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html)
- NestJS Documentation：[Interceptors](https://docs.nestjs.com/interceptors)
- 关联专题：[SOLID 设计原则](SOLID设计原则.md)
- 关联专题：[常用设计模式](常用设计模式.md)
