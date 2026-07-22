# Java 常识速览（对照 TypeScript）

对照可以帮助入门，但 Java 与 TypeScript 的运行时、泛型和类型语义不同，不能机械一一映射。

## 基本类型与引用类型

| Java                    | TypeScript 近似概念 | 关键差异                                         |
| ----------------------- | ------------------- | ------------------------------------------------ | --------------------------------------- |
| `int`、`long`、`double` | `number`            | Java 区分宽度和整数/浮点；JS number 是双精度浮点 |
| `Integer`、`Long`       | 可空数值联合类型    | 包装类是对象，可为 `null`，存在装箱/拆箱         |
| `String`                | `string`            | 都表现为不可变文本，但 API 和编码细节不同        |
| `List<T>`               | `T[]`               | Java 泛型主要在编译期擦除，集合 API 不同         |
| `Map<K,V>`              | `Map<K,V>`          | 键相等、迭代顺序和并发语义不同                   |
| `Optional<T>`           | `T                  | undefined` 的用途近似                            | Optional 是容器 API，不等同语言联合类型 |

DTO 是否用基本类型或包装类型由契约决定。包装类型能表达“未提供”，但还需区分 JSON 字段缺失与显式 `null`，并通过校验约束。

## 相等与哈希

```java
String a = new String("abc");
String b = new String("abc");

a == b;       // 比较引用，false
a.equals(b);  // String 的内容相等，true
```

基本类型的 `==` 比值，对象引用的 `==` 比身份。对象内容相等由 `equals` 契约定义。

重写 `equals` 时通常必须一致地重写 `hashCode`：相等对象必须拥有相同 hash code，反向不成立。作为 HashMap key 的对象在放入后不应改变参与相等/哈希的字段，否则可能无法正确查回。

## 集合

| 类型                | 特征                                                               |
| ------------------- | ------------------------------------------------------------------ |
| `ArrayList`         | 连续数组，按下标访问快；中间插删通常要移动元素                     |
| `LinkedList`        | 双向链表；已持有位置时插删便宜，但按下标定位要遍历，缓存局部性较差 |
| `HashMap`           | 基于哈希桶，无通用迭代顺序保证，非线程安全                         |
| `LinkedHashMap`     | 维护插入顺序或访问顺序，可用于构建有界 LRU                         |
| `TreeMap`           | 按比较器/自然顺序组织键                                            |
| `ConcurrentHashMap` | 支持并发访问，但复合业务操作仍要使用其原子 API 或额外协调          |

HashMap 在高碰撞桶中可树化，但阈值还受表容量等条件影响。记住相等/哈希、扩容成本和线程安全比死背阈值更重要。

## 继承与多态

```java
public final class UserService implements Closeable {
    @Override
    public void close() {}
}
```

- 类单继承，可实现多个接口；接口也可有默认方法。
- `final` 用于类、方法和变量时含义不同；对象引用 final 不代表对象内部不可变。
- overload 是同名不同参数的编译期选择；override 是子类对可重写实例方法提供实现。
- 泛型具有不变性等规则，`List<Dog>` 不是 `List<Animal>`；通配符用于表达生产者/消费者边界。

## 注解与依赖注入

Java 注解是元数据，只有框架、编译器或运行时代码读取它才产生行为。它与 TypeScript 装饰器用途相似，但规范和执行模型不同。

```java
@RestController
@RequestMapping("/orders")
class OrderController {
    private final OrderService service;

    OrderController(OrderService service) {
        this.service = service;
    }
}
```

构造器注入让依赖显式且便于测试。Spring 与 NestJS 都使用 IoC/DI 和声明式元数据，但生命周期、代理和容器规则并非完全相同。

## 异常

- 继承 `Exception` 但不继承 `RuntimeException` 的异常通常是 checked exception，调用方必须捕获或声明抛出。
- `RuntimeException` 及其子类是 unchecked exception，编译器不强制处理。
- `Error` 通常代表应用不应常规恢复的 JVM 问题。

业务异常是否使用 checked/unchecked 是 API 设计选择。无论哪种，都不能用大范围 `catch (Exception)` 吞掉根因；资源优先用 try-with-resources 关闭。

## 并发常识

- 普通集合和可变对象不会因为运行在 Spring 中就自动线程安全。
- `volatile` 提供可见性和部分有序性，不让 `count++` 变成原子操作。
- 线程池/虚拟线程解决任务调度成本，数据库连接和下游容量仍需有界控制。
- 请求上下文常通过 ThreadLocal 传播；异步和虚拟线程场景要验证框架的上下文传播方式。
