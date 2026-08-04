# MongoDB 高频面试题 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在数据库章节新增一篇覆盖 MongoDB 核心原理、工程取舍和高频追问的面试复习文档，并补齐所有导航入口。

**Architecture:** 正文集中在一个主题文件中，采用“问题—核心回答—追问/误区”的顺序，从选型和建模逐步进入索引、聚合、一致性、高可用和分片。章节目录负责详细入口，总目录、复习路线和 README 只维护简洁概览，避免在多处复制正文。

**Tech Stack:** Markdown、MongoDB Shell 风格 JavaScript、Shell 链接与格式检查

## Global Constraints

- 面向中高级前端、Node.js 和全栈岗位的高频面试复习，不扩张为安装教程、Atlas 控制台教程、ODM 完整教程或运维手册。
- 回答先给结论，再说明机制、适用条件和代价。
- 对版本、拓扑和部署配置敏感的行为明确边界，技术事实以 MongoDB 官方文档为主要依据。
- 示例使用简短的 MongoDB Shell 风格 JavaScript。
- MySQL 对比只用于解释取舍，不把 MongoDB 和关系型数据库描述为可以无条件互相替代。
- 不修改或提交 `.obsidian/`、`未命名*.base` 等与本任务无关的用户文件。

---

## File Map

- Create: `15-数据库/MongoDB高频面试题.md` — MongoDB 高频问题、回答、示例、追问和速记清单的唯一正文。
- Modify: `15-数据库/目录.md` — 数据库章节简介、MongoDB 入口及推荐学习顺序。
- Modify: `00-导航/目录.md` — 全库数据库模块的一行概览。
- Modify: `00-导航/复习路线.md` — 第三周数据库目标及一天路线中的数据库入口。
- Modify: `README.md` — 仓库结构中的数据库覆盖范围。

---

### Task 1: 编写 MongoDB 高频面试题正文

**Files:**
- Create: `15-数据库/MongoDB高频面试题.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-03-mongodb-interview-questions-design.md` 中的内容范围和表达约束。
- Produces: 标题为 `MongoDB 高频面试题` 的稳定文档路径，供四处导航引用。

- [ ] **Step 1: 核对官方资料中的边界事实**

查阅 MongoDB 官方文档，至少核对以下主题：BSON 类型和 16 MiB 限制、索引属性和复合索引规则、聚合优化、事务和单文档原子性、read concern/write concern、副本集选举、分片和分片键。记录结论时附官方文档链接，不复制大段原文。

- [ ] **Step 2: 写选型、基础模型与建模问题**

创建正文并依次回答：

1. MongoDB 是什么，与 MySQL 的核心差异是什么？
2. MongoDB 适合和不适合哪些场景？
3. BSON、文档、集合和 `ObjectId` 分别是什么？
4. “Schema Flexible” 是否等于没有 schema？
5. 为什么单个 BSON 文档存在 16 MiB 限制，大文件如何处理？
6. 什么时候嵌入（embedding），什么时候引用（referencing）？
7. 如何避免无界数组和持续膨胀的大文档？

至少给出一个订单文档示例，说明订单项适合嵌入、频繁独立变化且多处共享的实体通常更适合引用；同时明确最终选择取决于读写模式、一致性和数据规模。

- [ ] **Step 3: 写索引、查询与聚合问题**

依次回答：

1. MongoDB 常见索引类型和属性有哪些？
2. 复合索引字段顺序如何选择，ESR（Equality、Sort、Range）只是怎样的经验规则？
3. 什么是多键索引，为什么一个复合多键索引不能同时索引多个数组字段？
4. 什么是覆盖查询，投影为什么也会影响能否覆盖？
5. 唯一、稀疏和部分索引有什么区别？
6. TTL 索引的过期删除为何不是精确定时器？
7. 如何使用 `explain("executionStats")` 排查慢查询？
8. `skip/limit` 深分页为何变慢，如何使用稳定排序键做范围分页？
9. Aggregation Pipeline 常用阶段有哪些，为什么应尽早过滤和减少字段？
10. `$lookup` 的用途和成本是什么？

加入以下最小示例并解释字段顺序：

```javascript
db.orders.createIndex({ tenantId: 1, status: 1, createdAt: -1, _id: -1 });

db.orders
  .find({
    tenantId: "t1",
    status: "paid",
    $or: [
      { createdAt: { $lt: lastCreatedAt } },
      { createdAt: lastCreatedAt, _id: { $lt: lastId } },
    ],
  })
  .sort({ createdAt: -1, _id: -1 })
  .limit(20);
```

- [ ] **Step 4: 写一致性、副本集与分片问题**

依次回答：

1. MongoDB 哪些写操作具备单文档原子性？
2. 什么时候需要多文档事务，为什么不能把事务当成关系型建模的替代品？
3. read concern、write concern 和 read preference 分别控制什么？
4. 副本集由哪些角色构成，主节点故障后如何选举？
5. `w: "majority"` 能保证什么，不能保证什么？
6. 故障切换期间客户端为什么仍需处理暂时错误、重试和幂等？
7. 分片解决什么问题，`mongos`、config server 和 shard 分别做什么？
8. 好的分片键应具备哪些特征？
9. 单调递增分片键为什么可能制造写热点，hashed sharding 的代价是什么？
10. chunk 迁移和 resharding 为什么仍需要容量、流量和故障预案？

明确区分“已确认写入”“对多数成员持久确认”“故障场景绝不丢数据”三种强度不同的说法，禁止使用最后一种绝对承诺。

- [ ] **Step 5: 写工程追问、回答模板与自测清单**

补充连接池复用、慢查询监控、大文档、热点、批量写、幂等更新、数据校验和备份恢复等工程追问。文末用一个表格汇总“场景—首选思路—关键风险”，并提供以下口头回答结构：

```text
先说业务读写模式 → 再说建模或索引选择 → 说明一致性与故障边界 → 最后给 explain/指标/压测验证方法
```

自测清单至少包含：嵌入与引用、复合索引顺序、深分页、事务边界、副本集、读写关注、分片键和热点。

- [ ] **Step 6: 执行正文结构检查**

Run:

```bash
test -f '15-数据库/MongoDB高频面试题.md'
rg -n '^## |^### ' '15-数据库/MongoDB高频面试题.md'
awk '/^```/{n++} END{exit n % 2}' '15-数据库/MongoDB高频面试题.md'
rg -n 'MongoDB 没有事务|绝不丢数据|完全替代 MySQL|无需 schema' '15-数据库/MongoDB高频面试题.md'
```

Expected: 文件存在；标题覆盖选型、建模、索引、聚合、事务、副本集、分片、工程追问和自测；代码围栏数量为偶数；最后一条命令不匹配任何绝对化错误结论。

---

### Task 2: 接入章节导航和复习路线

**Files:**
- Modify: `15-数据库/目录.md:3-17`
- Modify: `00-导航/目录.md:25-31`
- Modify: `00-导航/复习路线.md:23-28,49-57`
- Modify: `README.md:20-35`

**Interfaces:**
- Consumes: `15-数据库/MongoDB高频面试题.md` 的稳定路径。
- Produces: 从章节目录、总目录、复习路线和 README 到新正文的可发现入口。

- [ ] **Step 1: 更新数据库章节目录**

把简介改为覆盖 MySQL、MongoDB 与 Redis；在表格中新增：

```markdown
| [MongoDB 高频面试题](MongoDB高频面试题.md)     | 文档建模、索引、聚合、事务、副本集与分片       |
```

学习顺序调整为：先学数据建模和约束，再学 MySQL 查询/事务，再通过 MongoDB 理解文档建模及横向扩展，最后引入 Redis 缓存与协调成本。

- [ ] **Step 2: 更新总目录和 README 概览**

将总目录数据库模块描述改为 `MySQL、MongoDB 与 Redis 的建模、查询和一致性`；将 README 结构中的数据库描述改为 `MySQL、MongoDB、Redis 与数据建模`。保持表格和代码块现有对齐风格。

- [ ] **Step 3: 更新复习路线**

第三周目标改为同时掌握 MySQL 索引/事务、MongoDB 文档建模/索引/分片边界和 Redis 缓存一致性。一天路线在场景题之前加入数据库目录入口，提醒快速复述三类数据系统的适用边界。

- [ ] **Step 4: 验证入口均已更新**

Run:

```bash
rg -n 'MongoDB' '15-数据库/目录.md' '00-导航/目录.md' '00-导航/复习路线.md' README.md
```

Expected: 四个文件均至少有一处 MongoDB 入口或范围描述，且 `15-数据库/目录.md` 包含可点击的相对链接。

---

### Task 3: 全量验证本次文档变更

**Files:**
- Verify: `15-数据库/MongoDB高频面试题.md`
- Verify: `15-数据库/目录.md`
- Verify: `00-导航/目录.md`
- Verify: `00-导航/复习路线.md`
- Verify: `README.md`

**Interfaces:**
- Consumes: Task 1 的正文和 Task 2 的导航入口。
- Produces: 可交付的验证证据，不产生新的产品文件。

- [ ] **Step 1: 检查 Markdown 差异格式**

Run:

```bash
git diff --check -- '15-数据库/MongoDB高频面试题.md' '15-数据库/目录.md' '00-导航/目录.md' '00-导航/复习路线.md' README.md
```

Expected: 无输出且退出码为 0。

- [ ] **Step 2: 检查本次涉及文档的本地链接**

运行一个只读脚本，提取五个 Markdown 文件中的相对链接，忽略 `http://`、`https://` 和锚点，并逐一确认目标文件存在。

Run:

```bash
python3 -c 'import pathlib,re,sys; files=[pathlib.Path(p) for p in ["15-数据库/MongoDB高频面试题.md","15-数据库/目录.md","00-导航/目录.md","00-导航/复习路线.md","README.md"]]; bad=[]; pattern=re.compile(r"\[[^]]*\]\(([^)]+)\)"); [(bad.append(f"{f}: {u}") if not (f.parent/u.split("#",1)[0]).resolve().exists() else None) for f in files for u in pattern.findall(f.read_text()) if u and not u.startswith(("http://","https://","#"))]; print("\n".join(bad)); sys.exit(bool(bad))'
```

Expected: 无输出且退出码为 0。

- [ ] **Step 3: 检查代码围栏和关键主题覆盖**

Run:

```bash
awk '/^```/{n++} END{exit n % 2}' '15-数据库/MongoDB高频面试题.md'
rg -q '嵌入.*引用|引用.*嵌入' '15-数据库/MongoDB高频面试题.md'
rg -q 'explain\("executionStats"\)' '15-数据库/MongoDB高频面试题.md'
rg -q 'read concern|读关注' '15-数据库/MongoDB高频面试题.md'
rg -q 'write concern|写关注' '15-数据库/MongoDB高频面试题.md'
rg -q '副本集' '15-数据库/MongoDB高频面试题.md'
rg -q '分片键' '15-数据库/MongoDB高频面试题.md'
```

Expected: 所有命令退出码均为 0。

- [ ] **Step 4: 审阅最终 diff 和工作区边界**

Run:

```bash
git diff --stat
git diff -- '15-数据库/MongoDB高频面试题.md' '15-数据库/目录.md' '00-导航/目录.md' '00-导航/复习路线.md' README.md
git status --short
```

Expected: 产品变更只包含计划列出的五个文件；`.obsidian/` 和 `未命名*.base` 等用户文件保持未修改、未暂存状态。
