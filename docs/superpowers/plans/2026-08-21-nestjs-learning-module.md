# NestJS Independent Learning Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the existing NestJS overview into a navigable five-article learning module, expand static and dynamic modules, preserve the completed logging material, update internal links, and publish the verified scoped change.

**Architecture:** Replace the mixed-topic `NestJS核心概念.md` with a `NestJS/` subdirectory whose index owns the learning sequence and whose articles each own one conceptual boundary. Reuse existing verified prose where possible, add only the missing foundational material, and link to adjacent database, queue, AOP, security, and DevOps chapters instead of duplicating them.

**Tech Stack:** Markdown, TypeScript/NestJS examples, project-local Prettier, shell content/link assertions, Git.

**Spec:** `docs/superpowers/specs/2026-08-20-nestjs-learning-module-design.md`

## Global Constraints

- Create exactly one NestJS index and five substantive foundation articles under `09-Node与服务端/NestJS/`.
- Remove `09-Node与服务端/NestJS核心概念.md` only after all useful content has been migrated.
- Do not create empty future-topic files; list advanced topics only as an honest roadmap in `NestJS/目录.md`.
- Use current NestJS official documentation for framework semantics and maintainer documentation for `nestjs-pino` and `nest-winston`.
- Preserve the already written Pino/Winston content and its production logging boundaries.
- Do not stage or modify unrelated Docker/navigation worktree changes.
- Use `pnpm exec prettier`; do not use global binaries or `npm`.
- The final Git action must use explicit paths, a Chinese Conventional Commit, a normal non-force push, and remote/local commit equality verification.

---

### Task 1: Create the NestJS learning entry and framework-positioning article

**Files:**

- Create: `09-Node与服务端/NestJS/目录.md`
- Create: `09-Node与服务端/NestJS/01-框架定位与项目结构.md`
- Modify: `09-Node与服务端/目录.md:5-15`

**Interfaces:**

- Consumes: the introduction, Express/Fastify comparison, selection boundaries, and review items from `09-Node与服务端/NestJS核心概念.md`.
- Produces: the canonical NestJS entry path `09-Node与服务端/NestJS/目录.md` and a first article that later articles can link back to.

- [ ] **Step 1: Run the baseline assertion and verify the new module is absent**

```bash
test -d '09-Node与服务端/NestJS' && test -f '09-Node与服务端/NestJS/目录.md'
```

Expected: FAIL because the independent NestJS directory does not exist.

- [ ] **Step 2: Create the index with the completed foundation path and honest future roadmap**

The index must contain:

```text
基础机制：框架定位 → 模块与 DI → 请求生命周期
工程基础：日志与可观测性 → 数据访问与事务
后续路线：配置、校验、异常、鉴权、缓存、测试、队列、微服务、生产运行
```

Only the five existing article paths may be Markdown links. Future roadmap entries stay plain text until their articles exist.

- [ ] **Step 3: Create the framework-positioning article**

Use these section headings and migrate the matching existing conclusions:

```markdown
# NestJS 框架定位与项目结构

## NestJS 解决什么问题

## 应用图与根模块

## Controller、Provider 与 Module 如何协作

## Express 与 Fastify 适配器

## 什么情况不适合 NestJS

## 40 秒面试回答

## 复习检查

## 参考
```

The application graph explanation must distinguish compile-time TypeScript imports from the runtime module/provider graph. The adapter comparison must require realistic benchmarking and runtime validation rather than claiming universal Fastify superiority.

- [ ] **Step 4: Update the parent Node chapter entry**

Replace the old article link with:

```markdown
| [NestJS 系统学习](NestJS/目录.md) | 框架定位、模块与 DI、请求生命周期、日志与数据访问 |
```

- [ ] **Step 5: Verify Task 1 content**

```bash
test -f '09-Node与服务端/NestJS/目录.md'
test -f '09-Node与服务端/NestJS/01-框架定位与项目结构.md'
rg -q '\[NestJS 系统学习\]\(NestJS/目录.md\)' '09-Node与服务端/目录.md'
```

Expected: all commands exit 0.

### Task 2: Build the modules and dependency-injection foundation

**Files:**

- Create: `09-Node与服务端/NestJS/02-模块与依赖注入.md`

**Interfaces:**

- Consumes: the existing module, provider-scope, and circular-dependency prose plus current NestJS module, custom-provider, injection-scope, dynamic-module, and circular-dependency documentation.
- Produces: the canonical explanations and examples for static modules, dynamic modules, provider registration conventions, scopes, and circular dependencies.

- [ ] **Step 1: Run the content assertion before creating the article**

```bash
doc='09-Node与服务端/NestJS/02-模块与依赖注入.md'
rg -q '^## 静态模块与动态模块$' "$doc" && rg -q 'DynamicModule' "$doc"
```

Expected: FAIL because the article is absent.

- [ ] **Step 2: Write module metadata and provider-token foundations**

Cover `imports`, `controllers`, `providers`, and `exports` as a module's private/public boundary. Show class providers and the four custom-provider forms:

```ts
const providers = [
	OrderService,
	{ provide: API_BASE_URL, useValue: 'https://example.test' },
	{ provide: PaymentPort, useClass: StripePaymentAdapter },
	{ provide: CACHE, useExisting: SharedCache },
	{
		provide: ApiClient,
		inject: [API_BASE_URL],
		useFactory: (baseUrl: string) => new ApiClient(baseUrl)
	}
];
```

Explain that TypeScript interfaces do not exist as runtime injection tokens; use a class, string, or preferably exported `Symbol` token when there is no runtime class token.

- [ ] **Step 3: Write the static/dynamic module comparison and synchronous example**

The comparison must establish:

- A static module is imported as a module class and its metadata is fixed by source-level declarations.
- A dynamic module is still a Nest module; a static factory method returns a `DynamicModule` object based on caller-supplied configuration.
- The returned metadata extends rather than replaces base `@Module()` metadata.
- Dynamic does not mean lazy loading, global scope, or per-request instances.

Use a typed options token and a minimal implementation:

```ts
export const CLIENT_OPTIONS = Symbol('CLIENT_OPTIONS');

export interface ClientModuleOptions {
	baseUrl: string;
}

@Module({})
export class ClientModule {
	static register(options: ClientModuleOptions): DynamicModule {
		return {
			module: ClientModule,
			providers: [{ provide: CLIENT_OPTIONS, useValue: options }, ClientService],
			exports: [ClientService]
		};
	}
}
```

- [ ] **Step 4: Explain registration naming and asynchronous configuration**

Document the conventional meanings without presenting them as compiler-enforced rules:

| Method                           | Intended meaning                                                           |
| -------------------------------- | -------------------------------------------------------------------------- |
| `register`                       | Configure an instance for the importing module                             |
| `forRoot`                        | Establish application-wide/root configuration once                         |
| `forFeature`                     | Register feature-specific providers using root configuration               |
| `registerAsync` / `forRootAsync` | Resolve options through DI with `useFactory`, `useClass`, or `useExisting` |

Include a `forRootAsync` consumer example that injects `ConfigService`; explain that `Async` refers to obtaining configuration through DI/asynchronous factories, not to lazy module loading.

- [ ] **Step 5: Preserve scopes and circular-dependency guidance**

Migrate the scope table, the three circular-dependency categories, the preferred dependency-direction repair, `forwardRef()` fallback, `ModuleRef` boundary, and the existing 40-second answer. Add a separate 40-second static/dynamic-module answer.

- [ ] **Step 6: Verify Task 2 terminology**

```bash
doc='09-Node与服务端/NestJS/02-模块与依赖注入.md'
rg -q '^## 静态模块与动态模块$' "$doc"
rg -q 'registerAsync.*forRootAsync' "$doc"
rg -q '不等于.*懒加载' "$doc"
rg -q '^## 循环引用$' "$doc"
rg -q 'ConfigurableModuleBuilder' "$doc"
```

Expected: all commands exit 0.

### Task 3: Split request lifecycle and observability into focused articles

**Files:**

- Create: `09-Node与服务端/NestJS/03-请求生命周期.md`
- Create: `09-Node与服务端/NestJS/04-日志与可观测性.md`

**Interfaces:**

- Consumes: the existing request-lifecycle table and the complete Pino/Winston logging section.
- Produces: stable anchor targets `#请求生命周期` and `#日志与可观测性` for internal links.

- [ ] **Step 1: Verify both target articles are absent**

```bash
test ! -e '09-Node与服务端/NestJS/03-请求生命周期.md'
test ! -e '09-Node与服务端/NestJS/04-日志与可观测性.md'
```

Expected: both commands exit 0 before implementation.

- [ ] **Step 2: Create the lifecycle article**

Migrate the existing lifecycle flow and responsibility table. Add:

- the distinction between the normal return path and exception path;
- global/controller/route binding scope and the warning that exact local ordering must be verified;
- short scenarios choosing Middleware, Guard, Pipe, Interceptor, or Filter;
- a 40-second interview answer and links to AOP and Web security material.

- [ ] **Step 3: Create the observability article without reducing the completed logging scope**

Move the existing content covering:

- Nest `LoggerService`, `bufferLogs`, and `useLogger`;
- `nestjs-pino`, Pino request context, redaction, and structured error objects;
- `nest-winston`, format, transports, and container stdout guidance;
- Pino/Winston comparison;
- request ID versus trace context;
- stable fields, errors, redaction, sampling, and logs/metrics/traces boundaries;
- the existing 40-second interview answer and references.

Add one explicit paragraph stating that HTTP interceptors do not cover bootstrapping, scheduled jobs, queue workers, or arbitrary service calls.

- [ ] **Step 4: Verify both articles retain required concepts**

```bash
life='09-Node与服务端/NestJS/03-请求生命周期.md'
logs='09-Node与服务端/NestJS/04-日志与可观测性.md'
rg -q 'Middleware.*Guard.*Interceptor' "$life"
rg -q 'Exception Filter' "$life"
rg -q 'bufferLogs: true' "$logs"
rg -q '^## Pino 与 Winston 怎么选$' "$logs"
rg -q 'requestId' "$logs"
rg -q '默认脱敏' "$logs"
```

Expected: all commands exit 0.

### Task 4: Complete data-access migration and repair internal navigation

**Files:**

- Create: `09-Node与服务端/NestJS/05-数据访问与事务.md`
- Delete: `09-Node与服务端/NestJS核心概念.md`
- Modify: `16-后端常识/目录.md:21`
- Modify: `面试冲刺/2026-08-04/09-知识库最短索引.md:15`
- Modify: `面试冲刺/2026-08-04/10-本次面试复盘.md:50`

**Interfaces:**

- Consumes: the existing TypeORM and transaction guidance and every repository link to `NestJS核心概念.md`.
- Produces: a focused data-access article and zero live references to the removed file.

- [ ] **Step 1: Create the data-access article**

Use these sections:

```markdown
# NestJS 数据访问与事务

## NestJS 不绑定 ORM

## Repository 边界与依赖注入

## TypeORM 常见风险

## 事务边界

## 常见误区

## 40 秒面试回答

## 复习检查

## 参考
```

Preserve N+1, batch-write, migration, same transaction manager, and no slow network I/O inside database transactions. Link to the MySQL and table-design articles for database theory.

- [ ] **Step 2: Update live links to the new canonical targets**

Use these targets:

```text
16-后端常识/目录.md
  -> ../09-Node与服务端/NestJS/目录.md

面试冲刺/2026-08-04/09-知识库最短索引.md
  -> ../../09-Node与服务端/NestJS/目录.md

面试冲刺/2026-08-04/10-本次面试复盘.md
  -> ../../09-Node与服务端/NestJS/02-模块与依赖注入.md#循环引用
```

- [ ] **Step 3: Delete the mixed-topic legacy article**

Delete `09-Node与服务端/NestJS核心概念.md` only after Tasks 1–4 content assertions pass.

- [ ] **Step 4: Verify migration completeness**

```bash
test ! -e '09-Node与服务端/NestJS核心概念.md'
! rg -n '09-Node与服务端/NestJS核心概念\.md|\]\([^)]*NestJS核心概念\.md' --glob '*.md' . --glob '!docs/superpowers/specs/2026-08-20-nestjs-learning-module-design.md' --glob '!docs/superpowers/plans/2026-08-21-nestjs-learning-module.md'
```

Expected: the old file is absent and no live Markdown link references it. Historical design/plan prose may mention the path as migration evidence.

### Task 5: Validate, commit, push, and confirm remote consistency

**Files:**

- Validate: all files under `09-Node与服务端/NestJS/`
- Validate: `09-Node与服务端/目录.md`
- Validate: `16-后端常识/目录.md`
- Validate: the two updated interview-sprint link files
- Include: this plan and `docs/superpowers/specs/2026-08-20-nestjs-learning-module-design.md`

**Interfaces:**

- Consumes: all completed documentation tasks.
- Produces: a scoped Chinese Conventional Commit on the current branch and the same commit ID on its upstream.

- [ ] **Step 1: Format all task Markdown files**

```bash
pnpm exec prettier --write \
  '09-Node与服务端/NestJS/*.md' \
  '09-Node与服务端/目录.md' \
  '16-后端常识/目录.md' \
  '面试冲刺/2026-08-04/09-知识库最短索引.md' \
  '面试冲刺/2026-08-04/10-本次面试复盘.md' \
  'docs/superpowers/specs/2026-08-20-nestjs-learning-module-design.md' \
  'docs/superpowers/plans/2026-08-21-nestjs-learning-module.md'
```

Expected: Prettier reports each task file without errors.

- [ ] **Step 2: Run content, code-fence, and local-link verification**

Run all Task 1–4 assertions again. Then execute a temporary read-only link checker that resolves every relative Markdown link in changed files and ignores HTTP(S) links and in-page anchors. For each changed file, assert ` rg -c '^```' ` is even.

Expected: zero missing local targets and zero unpaired code fences.

- [ ] **Step 3: Run repository diff checks and inspect scope**

```bash
git diff --check
git diff --stat
git status --short
```

Expected: no whitespace errors. Existing unrelated Docker/navigation changes remain unstaged and are reported separately.

- [ ] **Step 4: Stage only the NestJS task paths**

```bash
git add -- \
  '09-Node与服务端/NestJS' \
  '09-Node与服务端/NestJS核心概念.md' \
  '09-Node与服务端/目录.md' \
  '16-后端常识/目录.md' \
  '面试冲刺/2026-08-04/09-知识库最短索引.md' \
  '面试冲刺/2026-08-04/10-本次面试复盘.md' \
  'docs/superpowers/specs/2026-08-20-nestjs-learning-module-design.md' \
  'docs/superpowers/plans/2026-08-21-nestjs-learning-module.md'

git diff --cached --check
git diff --cached --name-status
```

Expected: the staged set contains only the listed NestJS, navigation, spec, and plan paths.

- [ ] **Step 5: Commit with a Chinese Conventional Commit message**

```bash
git commit -m 'docs(nestjs): 拆分并扩展 NestJS 学习模块'
```

Expected: commit succeeds and the commit summary lists only scoped task files.

- [ ] **Step 6: Push normally and verify remote equality**

```bash
git push
git fetch origin
test "$(git rev-parse HEAD)" = "$(git rev-parse '@{upstream}')"
```

Expected: normal push succeeds without force, and local `HEAD` equals the configured upstream commit.
