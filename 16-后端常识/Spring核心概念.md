# Spring 核心概念

Spring Framework 的核心价值是 IoC 容器、模块化基础设施和声明式编程模型。NestJS 有相似概念，但不能假设注解/装饰器和代理行为完全一致。

## IoC 与依赖注入

```java
@Service
public class OrderService {
    private final OrderRepository repository;

    public OrderService(OrderRepository repository) {
        this.repository = repository;
    }
}
```

对象由容器创建并注入依赖，便于替换实现、测试和集中管理生命周期。单构造器通常无需标记 `@Autowired`。构造器参数过多往往提示职责或抽象边界需要检查。

## Bean 作用域

| 作用域    | 含义                                           |
| --------- | ---------------------------------------------- |
| singleton | 每个容器/Bean 定义通常一个实例，默认           |
| prototype | 每次从容器请求创建新实例；容器不完整管理其销毁 |
| request   | 每个 HTTP 请求一个实例                         |
| session   | 每个 HTTP session 一个实例                     |

默认单例 Bean 会被并发调用，不应保存请求相关可变状态。线程安全取决于自身字段和依赖，不是 `@Service` 自动提供。

## AOP 与代理

AOP 把事务、审计、指标等横切逻辑应用到匹配的连接点。Spring AOP 通常通过 JDK 动态代理或基于类的代理拦截方法调用；私有/final 方法、对象内部调用和绕过容器创建的实例会影响拦截。

代理只覆盖通过代理发生的调用，不等于所有 Java 方法执行都能被 AOP 观察。需要代理语义的对象必须由容器管理。

## 声明式事务

```java
@Transactional
public void placeOrder(Command command) {
    repository.save(...);
    inventory.reserve(...);
}
```

Spring 用事务拦截器和 `TransactionManager` 在方法调用前后管理事务。重点检查：

- 代理模式下自调用 `this.otherMethod()` 不经过代理，另一个方法上的事务元数据不会单独生效。
- 默认回滚规则通常针对 `RuntimeException` 和 `Error`；checked exception 需要按业务显式配置 `rollbackFor` 或自行标记回滚。
- 捕获异常并正常返回会让拦截器看到成功，除非重新抛出或显式标记 rollback-only。
- 方法可见性取决于代理类型和 Spring 版本：接口代理只能拦截接口公开方法；基于类的代理在当前 Spring 中可支持部分 protected/package-visible 方法，但 private/final 方法仍不应依赖代理事务。
- 新线程、异步回调和远程调用不会自动加入当前线程绑定事务。
- `REQUIRES_NEW` 等传播级别可能额外占用数据库连接，错误嵌套会耗尽连接池。

优先把事务边界放在独立 public service 方法，通过另一个 Bean 调用；复杂控制可使用 `TransactionTemplate`。不推荐为绕过自调用而随意自注入或暴露当前代理，这会隐藏设计问题。

## Spring Boot

Spring Boot 基于 Spring 提供自动配置、starter 依赖、外部化配置、可执行应用和生产运维支持。自动配置是按 classpath、已有 Bean 和配置条件生效，不是“引入依赖就永远自动正确”。

- 用配置属性类表达结构化配置并校验。
- 了解 actuator 端点暴露和鉴权，不能把敏感环境信息直接公开。
- 自动配置有问题时查看 condition evaluation，而不是盲目复制禁用项。

## Web 请求边界

| Spring              | 常见职责                        |
| ------------------- | ------------------------------- |
| Filter              | Servlet 容器级请求/响应过滤     |
| HandlerInterceptor  | Spring MVC handler 调用前后逻辑 |
| `@ControllerAdvice` | 控制器异常与绑定等统一处理      |
| Bean Validation     | DTO 字段和对象约束校验          |

认证、授权、参数校验、事务和业务规则分属不同边界。统一异常处理应保留 trace ID 和内部日志，但不给客户端泄露堆栈。

## MyBatis 参数

```xml
SELECT * FROM orders WHERE status = #{status}
```

`#{}` 绑定预编译参数。`${}` 是原始文本替换，不能接收不可信输入；动态列名/排序方向无法用普通参数占位时，应映射到服务端 allowlist，而不是直接拼接请求字符串。
