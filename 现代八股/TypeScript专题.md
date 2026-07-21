# TypeScript 专题

> 简历第 21 行写「**熟练使用** TypeScript」，但仓库里 TS 相关文档一篇都没有。
> 深圳现在 TS 问得越来越细，尤其是**类型体操**——
> 写「熟练」就要能接住 `DeepPartial<T>` 这种题。

---

## 一、基础辨析

### Q1：interface 和 type 的区别？

| | interface | type |
|---|---|---|
| 声明合并 | ✅ 同名会自动合并 | ❌ 重复定义报错 |
| 扩展 | `extends` | 交叉类型 `&` |
| 能表达的类型 | 只能是对象/函数/类的形状 | **任意类型**——联合、元组、原始类型、条件类型、映射类型 |
| 性能 | 大型项目中 interface 的检查略快（可缓存） | 复杂 type 可能拖慢编译 |

**实践建议**（有立场比背表格好）：
> 对外暴露的、可能被使用方扩展的用 interface（比如组件 props、SDK 类型），
> 因为它支持声明合并；
> 内部的工具类型、联合类型、条件类型只能用 type。
> 我团队里的约定是**对象形状优先 interface，其余用 type**，
> 主要是为了一致，而不是因为哪个更好。

**衍生问**：什么是声明合并？举个用途？
→ 给第三方库补充类型（`declare module 'xxx' { interface Window { myApp: X } }`）

### Q2：`extends` 有几种含义？

**这题很能筛人，因为 `extends` 在 TS 里是重载的：**
1. **接口继承**：`interface A extends B {}`
2. **泛型约束**：`function f<T extends object>(x: T)`
3. **条件类型**：`T extends U ? X : Y`
4. **类继承**：`class A extends B {}`

### Q3：`unknown`、`any`、`never` 的区别？

- `any`——**关闭类型检查**，可以赋给任何类型，也可以被任何类型赋值。传染性强，能不用就不用
- `unknown`——**类型安全的 any**。任何值都能赋给它，但**用之前必须收窄**
  （类型守卫 / 断言）。接收外部数据（接口响应、JSON.parse）应该用它
- `never`——**永不存在的值**。函数永远不返回（抛错/死循环）、
  联合类型被排空后的结果。**常用于穷尽性检查**：

```ts
function handle(s: 'a' | 'b') {
  switch (s) {
    case 'a': return 1
    case 'b': return 2
    default: {
      const _exhaustive: never = s   // 新增枚举值时这里会报错，提醒你补分支
      return _exhaustive
    }
  }
}
```
**这个穷尽性检查的技巧一定要会**——它是 TS 在业务里最实用的价值之一。

### Q4：`?.`、`??` 和 `||` 的区别？

- `||` 在**假值**（`0`、`''`、`false`、`null`、`undefined`、`NaN`）时走右边
- `??` 只在 **`null` / `undefined`** 时走右边
- 典型 bug：`const pageSize = input || 10`——用户输入 0 会变成 10

---

## 二、类型工具（必须会手写）

### Q5：内置工具类型分别怎么实现？

**面试常见的是让你现场手写，所以要记实现而不只是用法。**

```ts
// Partial：全部变可选
type Partial<T> = { [K in keyof T]?: T[K] }

// Required：去掉可选（-? 移除修饰符）
type Required<T> = { [K in keyof T]-?: T[K] }

// Readonly
type Readonly<T> = { readonly [K in keyof T]: T[K] }

// Pick：挑出指定 key
type Pick<T, K extends keyof T> = { [P in K]: T[P] }

// Record：构造键值类型
type Record<K extends keyof any, V> = { [P in K]: V }

// Exclude：从联合类型中排除（分布式条件类型）
type Exclude<T, U> = T extends U ? never : T

// Extract：从联合类型中提取
type Extract<T, U> = T extends U ? T : never

// Omit：排除指定 key（组合 Pick + Exclude）
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>

// NonNullable
type NonNullable<T> = T & {}          // 新版实现
// 旧版：T extends null | undefined ? never : T

// ReturnType：用 infer 提取返回值
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any

// Parameters：提取参数元组
type Parameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never

// Awaited（简化版）：拆 Promise
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T
```

### Q6：`infer` 是什么？

- 只能用在**条件类型的 `extends` 子句里**，
  作用是**声明一个待推断的类型变量**，让 TS 帮你把类型"解构"出来
- 理解方式：**模式匹配**。`T extends Promise<infer U> ? U : never`
  意思是"如果 T 长得像 `Promise<某个东西>`，把那个东西叫 U 并返回它"

**常考变体**：
```ts
// 取数组元素类型
type ElementOf<T> = T extends (infer U)[] ? U : never

// 取第一个参数
type FirstParam<T> = T extends (first: infer P, ...rest: any[]) => any ? P : never

// 字符串模板 + infer
type StartsWith<S> = S extends `${infer First}${string}` ? First : never
```

### Q7：什么是分布式条件类型？

**这题是 `Exclude` 能工作的原因，很多人只会用不知道为什么：**

当条件类型作用于**裸的泛型参数**且传入**联合类型**时，
会**自动展开成逐个判断再合并**：

```ts
type Exclude<T, U> = T extends U ? never : T
Exclude<'a' | 'b' | 'c', 'a'>
// 展开为：('a' extends 'a' ? never : 'a')
//       | ('b' extends 'a' ? never : 'b')
//       | ('c' extends 'a' ? never : 'c')
// = never | 'b' | 'c' = 'b' | 'c'
```

**怎么禁用分布式**？用方括号包起来，让它不再是"裸类型"：
```ts
type NoDistribute<T, U> = [T] extends [U] ? true : false
```

### Q8：手写 `DeepPartial<T>`

**这是被点名的题，必须会：**

```ts
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}
```

**但这个基础版有坑，能说出来才是加分**：
- 数组会被当成 object 递归，`string[]` 变成 `{ 0?: ..., length?: ... }`
- 函数也是 object
- `Date`、`Map`、`Set` 这类内置对象也会被拆开

**完善版**：
```ts
type Primitive = string | number | boolean | bigint | symbol | null | undefined

type DeepPartial<T> =
  T extends Primitive ? T
  : T extends (...args: any[]) => any ? T
  : T extends Date | RegExp ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends Map<infer K, infer V> ? Map<K, DeepPartial<V>>
  : T extends Set<infer U> ? Set<DeepPartial<U>>
  : { [K in keyof T]?: DeepPartial<T[K]> }
```

**面试策略**：先写基础版，然后**主动说**「这个版本对数组和内置对象处理得不对」，
再写完善版。主动指出自己方案的边界，比一次写对更能体现思维。

### Q9：其他常考手写题

```ts
// DeepReadonly
type DeepReadonly<T> = { readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K] }

// 把指定 key 变可选，其余不变（业务里非常常用）
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// 取出所有值为函数的 key
type FunctionKeys<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T]

// 联合转交叉（用逆变位置推断）
type UnionToIntersection<U> =
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never
```

`FunctionKeys` 那个模式（**映射后用 `[keyof T]` 索引取出非 never 的 key**）
非常常用，值得单独记住。

---

## 三、映射类型进阶

### Q10：`as` 在映射类型里做什么？（key remapping）

TS 4.1+ 支持在映射时**重命名 key**：

```ts
// 生成 getter 名字
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}
// { name: string } → { getName: () => string }

// 过滤 key（映射为 never 就会被丢弃）
type OmitByType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K]
}
```

### Q11：`keyof`、`typeof`、索引访问怎么配合？

```ts
const config = { host: 'a', port: 1 } as const
type Config = typeof config              // 从值反推类型
type Keys = keyof Config                 // 'host' | 'port'
type Port = Config['port']               // 1

// 从数组常量生成联合类型（非常实用）
const STATUS = ['draft', 'pending', 'done'] as const
type Status = typeof STATUS[number]      // 'draft' | 'pending' | 'done'
```

**最后那个模式在业务里极其常用**——
一份常量既能在运行时遍历渲染下拉框，又能在类型层面约束，不用写两遍。

### Q12：`as const` 做了什么？

- 所有属性变 `readonly`
- 字面量类型**不被拓宽**（`'a'` 保持 `'a'` 而不是 `string`）
- 数组变成只读元组

---

## 四、工程实践（你带团队，这块会被问）

### Q13：项目里 TS 应该配多严格？

- `strict: true` 是底线（包含 `strictNullChecks`、`noImplicitAny` 等）
- 额外推荐：`noUncheckedIndexedAccess`（数组索引访问返回 `T | undefined`，
  能挡掉很多运行时错误）、`exactOptionalPropertyTypes`
- **老项目迁移**：不要一次开全，先 `allowJs` + 逐文件迁移，
  用 `// @ts-expect-error`（不是 `@ts-ignore`）标记待处理项——
  区别是前者在错误消失后会报错提醒你删掉，不会烂在代码里

【需确认】你团队的 tsconfig 实际怎么配的？**这题你作为负责人被问的概率很高。**

### Q14：接口返回的数据类型怎么保证和后端一致？

- **手写类型的问题**：后端改了字段前端不知道，类型是"假的安全"
- 方案：
  - 从 **OpenAPI/Swagger 自动生成**类型（你们用 Apifox 的话可以导出）
  - 运行时校验（zod / io-ts）——**类型 + 运行时双保险**，
    zod 可以从 schema 反推类型，一份定义两处用
- **能提到「TS 的类型在运行时是不存在的，所以边界处需要运行时校验」
  是很成熟的认知**

### Q15：泛型什么时候该用，什么时候是过度设计？

> 泛型的价值是**建立输入和输出之间的类型关联**。
> 如果一个泛型参数只出现一次，它多半是多余的——
> `function f<T>(x: T): void` 和 `function f(x: unknown): void` 没区别。
>
> 我 review 时看到三层以上嵌套的条件类型会问一句：
> 这个复杂度是必要的，还是我们在炫技？类型是给人读的，
> 看不懂的类型比 any 更糟，因为它还额外消耗了编译时间。

**这段话对你「带团队」的定位特别加分。**
