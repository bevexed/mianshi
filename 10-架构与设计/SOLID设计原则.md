# SOLID 设计原则（TypeScript / 前端视角）

SOLID 是五项模块设计原则的缩写，目标是让变化被限制在清晰边界内，使代码更容易理解、替换和测试。它们不是 GoF 设计模式，也不是要求每段代码都增加接口、类和依赖注入容器的硬性规则。

在前端工程中，“模块”不只指 class，也可以是组件、Hook、Store、Service、函数或一个包。判断是否需要应用原则，应从真实变化和维护成本出发。

## 一张表先记住

| 缩写 | 原则                | 核心问题                                   | 常见坏味道                                  |
| ---- | ------------------- | ------------------------------------------ | ------------------------------------------- |
| S    | 单一职责原则（SRP） | 谁会因为什么原因修改它？                   | 一个模块同时受 UI、接口、埋点等多方变化影响 |
| O    | 开闭原则（OCP）     | 新增一种变化时，能否扩展而少改稳定代码？   | 每加一种类型都修改多处 `if / switch`        |
| L    | 里氏替换原则（LSP） | 替换实现后，调用方依赖的行为契约还成立吗？ | 类型兼容，但异常、返回值或副作用语义改变    |
| I    | 接口隔离原则（ISP） | 使用方是否被迫依赖不需要的能力？           | 大接口、宽泛组件 Props、无意义的空实现      |
| D    | 依赖倒置原则（DIP） | 业务规则是否依赖抽象，而非基础设施细节？   | 业务代码直接创建请求、存储和日志实现        |

五项原则彼此关联，但不要为了“满足 SOLID”一次性重构全部代码。先找到最频繁、代价最高的变化点，再建立恰好够用的边界。

---

## S：单一职责原则

**定义**：一个模块应只有一个主要的变化原因，或者说只对一类角色负责。

SRP 不是“一个函数只能写几行”或“一个类只能有一个方法”。关键是不同变化是否会反复牵动同一个模块。

例如订单页面如果同时负责字段校验、DTO 转换、请求、埋点和 UI 状态，任意一方变化都要修改页面。可以把具体职责拆开，让页面只负责流程编排：

```ts
type OrderDraft = {
	items: Array<{ skuId: string; count: number }>;
};

type SubmitOrderDeps = {
	validate: (draft: OrderDraft) => void;
	createOrder: (draft: OrderDraft) => Promise<{ id: string }>;
	track: (event: string, payload: Record<string, unknown>) => void;
};

async function submitOrder(draft: OrderDraft, deps: SubmitOrderDeps) {
	deps.validate(draft);
	const order = await deps.createOrder(draft);
	deps.track('order_created', { orderId: order.id });
	return order;
}
```

这里不是把代码机械拆成更多文件，而是让校验规则、接口协议和埋点协议能够独立变化、独立测试。`submitOrder` 仍有一个清晰职责：编排提交订单的用例。

**前端判断方式**：

- 组件是否同时处理复杂数据获取、领域计算和展示细节？
- Hook 是否既管理状态，又直接操作 DOM、请求和埋点？
- 一个文件的修改是否经常需要 UI、后端和数据团队同时确认？
- 测试一个业务分支时，是否被迫初始化许多无关依赖？

拆分后仍需保留合理内聚。把每一行都提取成函数，会增加跳转和参数传递，并不等于职责更清晰。

---

## O：开闭原则

**定义**：软件实体应对扩展开放、对修改关闭。

“对修改关闭”不是永远不能修改旧代码，而是当一个已知变化维度持续增加时，新增实现应主要通过扩展完成，尽量不反复改动已经稳定的核心流程。

```ts
type Order = {
	customerType: string;
	amount: number;
};

type PricingPolicy = {
	supports: (order: Order) => boolean;
	calculate: (order: Order) => number;
};

function calculatePayable(order: Order, policies: PricingPolicy[]) {
	const policy = policies.find((item) => item.supports(order));
	return policy ? policy.calculate(order) : order.amount;
}

const vipPolicy: PricingPolicy = {
	supports: (order) => order.customerType === 'vip',
	calculate: (order) => order.amount * 0.8
};
```

新增客户类型时，可以注入新的 `PricingPolicy`，无需修改 `calculatePayable`。这与[策略模式](常用设计模式.md#三策略模式)的意图一致。

**边界**：

- 扩展点应来自已经出现的变化，而不是猜测所有未来需求。
- 多个策略同时命中时，需要明确优先级、互斥或叠加规则。
- 只有两条稳定分支时，直接条件判断通常更清楚。
- 安全、计费等规则仍需服务端做最终裁决，前端抽象不能替代可信边界。

---

## L：里氏替换原则

**定义**：使用基类型的地方应能替换为其子类型或其他实现，而不破坏调用方依赖的正确性。

LSP 关注的是**行为契约**，不只是 TypeScript 类型能否通过。实现不能擅自加强前置条件、削弱后置保证、改变错误语义或破坏不变量。

```ts
type User = { id: string; name: string };

interface UserSource {
	// 找不到用户时返回 null；网络或解析失败时应抛出异常
	findById(id: string): Promise<User | null>;
}

class HttpUserSource implements UserSource {
	constructor(private readonly request: (id: string) => Promise<User>) {}

	async findById(id: string) {
		try {
			return await this.request(id);
		} catch (error) {
			if (isNotFoundError(error)) return null;
			throw error;
		}
	}
}
```

如果某个实现把超时、鉴权失败和 JSON 解析失败全部吞掉并返回 `null`，它虽然满足返回类型，却把“系统故障”伪装成“数据不存在”，不再是可靠替代。

> 示例中的 `isNotFoundError` 代表项目自己的错误分类函数，重点是契约，而不是具体请求库。

**实践重点**：

- 在接口旁写清空值、异常、幂等性、副作用和顺序保证。
- 为多个实现运行同一组契约测试，而不只测试各自内部逻辑。
- 不要为了复用几行代码建立错误的继承关系；组合通常更灵活。
- TypeScript 是结构类型系统，形状相同不代表运行时语义相同。

---

## I：接口隔离原则

**定义**：调用方不应被迫依赖自己不使用的方法；多个面向使用方的小接口，通常好于一个万能接口。

```ts
type User = { id: string; name: string };

interface UserReader {
	findById(id: string): Promise<User | null>;
}

interface UserWriter {
	save(user: User): Promise<void>;
}

class ProfileQuery {
	constructor(private readonly users: UserReader) {}

	load(id: string) {
		return this.users.findById(id);
	}
}
```

只读页面依赖 `UserReader`，测试替身无需实现保存、删除、导出和批量同步等无关能力。写入用例可以按需组合 `UserReader & UserWriter`。

**前端场景**：

- 组件 Props 只暴露当前组件真正使用的数据和回调。
- Store 按查询、命令或业务域拆分选择器，而不是让所有组件依赖整个状态对象。
- SDK 按能力拆分接口，使浏览器、SSR、测试环境能提供各自支持的实现。

接口也不能无限细分。若多个方法总是一起变化、一起被使用，把它们放在同一接口反而更内聚。

---

## D：依赖倒置原则

**定义**：高层业务策略不应依赖低层实现细节；二者都依赖稳定抽象，抽象也不应反向依赖具体实现。

在 TypeScript 中，抽象可以是 interface，也可以是一个很小的函数类型，不必为每个依赖都创建 class。

```ts
type User = { id: string; name: string };
type LoadUser = (id: string) => Promise<User | null>;

class ProfileService {
	constructor(private readonly loadUser: LoadUser) {}

	async getDisplayName(id: string) {
		const user = await this.loadUser(id);
		return user?.name ?? '匿名用户';
	}
}
```

`ProfileService` 只依赖“按 ID 加载用户”的业务能力，不知道数据来自 `fetch`、IndexedDB、SSR 服务还是测试替身。组装层负责选择具体实现。

**DIP、DI 与 IoC 的关系**：

- DIP 是依赖方向的设计原则。
- 依赖注入（DI）是把依赖从外部传入的实现手段。
- 控制反转（IoC）描述创建和调用控制权从业务对象转移给外部机制。
- 使用 DI 容器不代表自动满足 DIP；如果高层代码仍依赖框架类型和具体 SDK，依赖方向依然可能错误。

详见[依赖注入与控制反转](常用设计模式.md#十三依赖注入与控制反转不是-gof-模式)。

---

## SOLID 与设计模式的关系

| 原则 | 常见的模式或手段             | 需要避免的误解             |
| ---- | ---------------------------- | -------------------------- |
| SRP  | 分层、外观、命令、职责链     | 文件多就等于职责单一       |
| OCP  | 策略、工厂、插件注册表       | 所有条件分支都必须改成多态 |
| LSP  | 契约测试、组合、适配器       | 只要类型兼容就可以替换     |
| ISP  | 小接口、能力接口、精简 Props | 每个方法都要单独建接口     |
| DIP  | 依赖注入、端口与适配器、工厂 | 引入 DI 容器就完成了解耦   |

设计原则帮助判断代码边界，设计模式提供一些反复验证过的组织方式。模式可以帮助落实原则，但不能证明设计一定合理。

## 什么时候不要急着套 SOLID

- 需求仍在探索、变化方向尚不稳定时，过早抽象会固化错误边界。
- 一次性脚本、局部纯函数或非常小的组件，不一定需要接口和容器。
- 只有一个真实实现且替换成本很低时，可以先直接依赖，等第二个变化出现再抽象。
- 为消除几行重复而制造大量间接层，可能比重复本身更难维护。

更稳妥的顺序是：先写清楚的实现和测试，观察变化，再在真实压力点建立边界。

## 面试回答方式

回答 SOLID 不要只背五个英文单词，可以按下面顺序：

1. 先说明 SOLID 是设计原则，不是五种设计模式。
2. 用“变化原因、扩展点、行为契约、使用方接口、依赖方向”概括五项原则。
3. 选择一个真实场景，说明原代码的变化为什么互相影响。
4. 解释重构后的边界、测试方式和新增成本。
5. 补充不会为了原则而过度设计。

一句话总结：

> SOLID 的价值不是让代码看起来更抽象，而是让最常发生的变化更局部，让替换实现时仍能守住行为契约。

## 参考资料

- Robert C. Martin：[Design Principles and Design Patterns](https://web.archive.org/web/20191116231621/http://fi.ort.edu.uy/innovaportal/file/2032/1/design_principles.pdf)
- 关联专题：[常用设计模式](常用设计模式.md)
- 关联专题：[AOP 面向切面编程](AOP面向切面编程.md)
