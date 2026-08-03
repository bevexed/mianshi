# MongoDB 高频面试题

面向中高级前端、Node.js 与全栈岗位：回答先交代结论，再说明适用边界、代价和验证方式。版本、部署拓扑和默认配置会影响最终行为；生产决策应以所用 MongoDB 版本与官方文档为准。

## 选型与基础模型

### 1. MongoDB 是什么，与 MySQL 的核心差异是什么？

**结论：MongoDB 是以 BSON 文档为基本存储和查询单位的数据库；MySQL 以关系表、行、约束和 SQL 联接为中心。** MongoDB 的文档可把一次读取常需的相关数据放在一起，常能减少应用端拼装与跨表查询；MySQL 的规范化、外键和成熟的关系查询更适合复杂关联与强约束的核心模型。两者是取舍，不是“谁完全替代谁”。

MongoDB 的集合（collection）相当于一组同类文档，不要求每个文档字段完全一致；查询、更新和索引都围绕文档路径工作。建模时先列出读写路径、增长上界和一致性边界，不能仅从 JSON 形状决定结构。

### 2. MongoDB 适合和不适合哪些场景？

**结论：适合数据形状会演进、按聚合根整读整写、需要横向扩展的业务；不适合把复杂关系、强全局约束和大量临时报表联接当作主路径的场景。**

- 适合：商品目录与内容元数据、用户配置、订单快照、事件/日志、按租户隔离的业务数据。它们通常按一个文档或少量固定查询路径访问。
- 谨慎或优先关系型：多对多关系密集、跨实体一致性规则很多、需要大量任意维度联表分析，或数据生命周期依赖严格外键约束时。
- 代价：灵活模型把完整性约束、迁移兼容和索引治理更多地交给应用与数据库校验；分片也不能修复低选择性查询或热点设计。

### 3. BSON、文档、集合和 `ObjectId` 分别是什么？

**结论：BSON 是 MongoDB 使用的二进制 JSON 扩展格式；文档是记录，集合是文档容器，`ObjectId` 是常见的 12 字节 `_id` 值。** BSON 除字符串、数字、数组、嵌套对象外还支持日期、二进制数据等类型；类型会影响比较、索引与序列化，金额仍应选定统一的精度方案（例如 Decimal128 或最小货币单位整数）。

`_id` 是文档主键，未指定时驱动或服务端通常生成 `ObjectId`；它包含时间相关信息，整体上随创建时间增长，但不应把它当成严格的全局时间顺序或业务编号。详见 [BSON 类型](https://www.mongodb.com/docs/manual/reference/bson-types/) 与 [ObjectId](https://www.mongodb.com/docs/manual/reference/bson-types/#objectid)。

### 4. “Schema Flexible” 是否等于没有 schema？

**结论：不等于。MongoDB 不强制所有文档同形，不代表业务没有字段、类型、必填和版本契约。** API DTO、写入校验、索引、数据迁移和读端兼容共同构成 schema。可用 collection 的 JSON Schema validation 拦住明显非法写入，但它不是替代领域校验、权限校验和回填策略的万能层。

```javascript
db.runCommand({
  collMod: "orders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["tenantId", "status", "items"],
      properties: { status: { enum: ["pending", "paid", "cancelled"] } },
    },
  },
});
```

### 5. 为什么单个 BSON 文档存在 16 MiB 限制，大文件如何处理？

**结论：单个 BSON 文档最大为 16 MiB，避免单次操作与复制传播出现无界对象；大二进制内容不要塞进普通文档。** 限制是文档级别而不是集合级别。文件可放对象存储并保存元数据和 URL；必须由 MongoDB 管理大二进制时，可考虑 GridFS。该限制与嵌入模型的增长上界直接相关。[官方限制说明](https://www.mongodb.com/docs/manual/reference/limits/#mongodb-limit-BSON-Document-Size)；[嵌入模型与 GridFS 建议](https://www.mongodb.com/docs/manual/data-modeling/embedding/)。

### 6. 什么时候嵌入（embedding），什么时候引用（referencing）？

**结论：同一聚合根、总量有上界且常一起读写时嵌入；独立生命周期、频繁独立变更、被多处共享或可能无限增长时引用。** 嵌入可在单文档原子更新内完成，减少额外查询；代价是重复、文档变大和数组索引成本。引用减少重复、便于独立管理；代价是需要额外查询或 `$lookup`，跨文档一致性可能需要事务或业务补偿。

```javascript
{
  _id: ObjectId("64f1c2a3b4c5d6e7f8091a2b"),
  tenantId: "t1",
  userId: "u1",             // 引用：用户独立演进、可被多处复用
  items: [                   // 嵌入：订单项随订单快照读取和结算
    { skuId: "sku-1", name: "键盘", priceCent: 29900, quantity: 1 },
  ],
  status: "paid",
  createdAt: ISODate("2026-08-03T10:00:00Z"),
}
```

订单项适合嵌入，因为下单时的名称和价格常需保留快照；库存、商品主数据、组织成员等频繁独立变化且多处共享的实体通常更适合引用。最终仍取决于读写模式、一致性要求和数据规模，而非“范式”标签。

### 7. 如何避免无界数组和持续膨胀的大文档？

**结论：给数组和文档设置显式上界；超过上界的数据拆到独立集合，并按父键与时间/序号索引。** 例如评论、消息、操作日志不要无限 `$push` 到一个用户或订单文档；可只保留最近 N 条摘要，将全量记录写入 `order_events`。同时监控文档大小、数组长度、索引键数量与更新延迟。大文档会放大网络、内存和复制成本，也可能触及 16 MiB 限制。

```javascript
db.orders.updateOne(
  { _id: orderId },
  { $push: { recentEvents: { $each: [event], $slice: -50 } } },
);
```

## 索引与查询

### 8. MongoDB 常见索引类型和属性有哪些？

**结论：先为真实查询形状设计单字段或复合 B-tree 索引，再按场景选多键、文本、地理空间、hashed 或 wildcard；每个索引都会增加写入、磁盘与构建成本。** 常见属性包括 `unique`、`partialFilterExpression`、`sparse`、`expireAfterSeconds`（TTL）与 hidden。索引不是越多越好：写入必须维护每个相关索引，低使用率索引应先通过指标和隐藏索引评估后再调整。

官方索引属性说明见 [Index Properties](https://www.mongodb.com/docs/manual/core/indexes/index-properties/)；可用索引类型与限制见 [Index Types](https://www.mongodb.com/docs/manual/indexes/)。

### 9. 复合索引字段顺序如何选择，ESR（Equality、Sort、Range）只是怎样的经验规则？

**结论：复合索引顺序必须匹配主要查询的等值过滤、排序与范围条件；ESR 是起点，不是机械规则。** 常把高频等值过滤放前面，使查询可缩小索引前缀；随后安排排序字段以避免内存排序；范围条件常放后面，因为它可能使后续键难以同时高效用于排序或过滤。实际还要比较选择性、是否有多个查询形状、排序方向、范围是否很窄，以及 `explain` 的扫描量。

### 10. 什么是多键索引，为什么一个复合多键索引不能同时索引多个数组字段？

**结论：数组字段被索引时，MongoDB 为数组元素生成多键（multikey）索引项；复合多键索引的每个文档最多只能有一个被索引字段是数组。** 若两个数组字段同时展开，组合数量会膨胀且语义模糊，因此建索引或写入会受限制。不要用两个无界数组硬凑索引；应重塑为子集合、一个数组加标量，或围绕查询重新建模。[官方多键索引限制](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/#compound-multikey-indexes)。

### 11. 什么是覆盖查询，投影为什么也会影响能否覆盖？

**结论：过滤、排序和返回字段都能从同一索引取得时，查询可只读索引而不用回表读取文档。** 投影若包含未索引字段，或默认返回未包含在索引中的 `_id`，就可能失去覆盖；应显式排除 `_id` 或把它纳入索引，并用 `explain` 确认没有 `FETCH`。多键索引覆盖还受数组字段和 `$elemMatch` 等限制。[官方查询优化说明](https://www.mongodb.com/docs/manual/core/query-optimization/)。

```javascript
db.orders.createIndex({ tenantId: 1, status: 1, createdAt: -1 });
db.orders.find(
  { tenantId: "t1", status: "paid" },
  { _id: 0, createdAt: 1 },
);
```

### 12. 唯一、稀疏和部分索引有什么区别？

**结论：唯一索引拒绝重复键；稀疏索引只为存在该字段的文档建键；部分索引只为匹配筛选表达式的文档建键。** 例如“同租户未删除用户的字符串邮箱唯一”适合带 `partialFilterExpression` 的唯一索引。软删除状态应正向建模为 `deleted: false`；查询只有包含或逻辑上蕴含部分筛选条件时，才能使用该索引。

```javascript
db.users.createIndex(
  { tenantId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string" }, deleted: false },
  },
);
```

部分索引支持的筛选表达式与查询使用条件见 [官方 Partial Indexes](https://www.mongodb.com/docs/manual/core/index-partial/)。

### 13. TTL 索引的过期删除为何不是精确定时器？

**结论：TTL 是后台删除机制，不承诺文档恰在到期时刻消失。** TTL monitor 定期扫描，负载、扫描批次和复制等都会造成延迟；因此鉴权或业务逻辑不能只依赖“记录已经被删”，而应同时在读取/鉴权时比较 `expiresAt`。TTL 适合会话、日志和短期事件等最终清理场景。[TTL 索引官方说明](https://www.mongodb.com/docs/manual/core/index-ttl/)。

### 14. 如何使用 `explain("executionStats")` 排查慢查询？

**结论：先对真实过滤、排序和投影执行 `explain("executionStats")`，再看是否选对索引与扫描/返回比，而不是只看“有没有 IXSCAN”。** 重点检查 winning plan 是否含 `COLLSCAN`、`SORT`、`FETCH`，`totalKeysExamined` 与 `totalDocsExamined` 是否远大于 `nReturned`，以及执行耗时、拒绝计划和分片下各 shard 的统计。用生产近似数据与参数组合测试，避免只拿小样本得出结论。

```javascript
db.orders.find({ tenantId: "t1", status: "paid" })
  .sort({ createdAt: -1 })
  .limit(20)
  .explain("executionStats");
```

### 15. `skip/limit` 深分页为何变慢，如何使用稳定排序键做范围分页？

**结论：`skip` 越深，服务端仍要遍历并丢弃越多结果；列表应使用与索引一致的稳定排序键作为游标。** 排序键必须能打破并列，因此在 `createdAt` 后追加 `_id`；若多租户查询，等值的 `tenantId`、`status` 放在前面。不要把示例中的 `lastCreatedAt`、`lastId` 当可信客户端条件，应把它们编码成服务端可验证的 cursor。

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

字段顺序是：`tenantId`、`status` 先做等值过滤，`createdAt` 和 `_id` 紧随其后支持倒序排序和游标范围；`_id` 保证同一时间戳下分页不重不漏。ESR 与真实执行计划共同验证是否值得保留该索引。

## 聚合与关联

### 16. Aggregation Pipeline 常用阶段有哪些，为什么应尽早过滤和减少字段？

**结论：常用 `$match`、`$project`/`$set`、`$unwind`、`$group`、`$sort`、`$limit`、`$lookup`；让无关文档尽早退出管道可降低后续计算、内存和网络成本。** 将可使用索引的 `$match` 尽量放在前面，限制进入 `$group`、`$sort`、`$lookup` 的数据量。投影的确切位置要结合依赖判断：优化器会自动下推不依赖计算字段的过滤与所需字段，通常不必为了“瘦身”手工把 `$project` 固定放最前，最终用 `aggregate(...).explain()` 观察优化结果。[官方聚合优化](https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/)。

```javascript
db.orders.aggregate([
  { $match: { tenantId: "t1", status: "paid" } },
  { $unwind: "$items" },
  { $group: { _id: "$items.skuId", sales: { $sum: "$items.quantity" } } },
  { $sort: { sales: -1 } },
  { $limit: 10 },
]);
```

### 17. `$lookup` 的用途和成本是什么？

**结论：`$lookup` 在管道中执行同库左外连接，适合补充少量关联数据，不应默认为高频主路径。** 它可能对输入的每批文档访问外部集合；缺少匹配索引、输入集过大、返回数组过宽，都会抬高延迟和内存使用。只有不改变结果语义，且后续过滤或排序不依赖关联字段时，才把可使用索引的 `$match` 或 `$limit` 提到 `$lookup` 前；同时为外部集合 join 条件建索引。若读路径稳定且需要的字段有限，可审视是否冗余一份快照。语义见 [聚合阶段参考](https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/#std-label-agg-pipeline-operator-reference)。

## 事务、一致性与副本集

### 18. MongoDB 哪些写操作具备单文档原子性？

**结论：对单个文档的写操作是原子的，包括单文档 `insertOne`、`updateOne`、`replaceOne`、`findOneAndUpdate` 与 `deleteOne`；更新应把并发前提写进过滤条件。** 原子性不等于跨文档一致性，也不等于网络失败时客户端一定知道结果。对库存扣减等条件更新，过滤条件可防止超卖：

```javascript
db.products.updateOne(
  { _id: skuId, stock: { $gte: quantity } },
  { $inc: { stock: -quantity } },
);
```

同一文档内可用嵌入将许多一致性需求收敛为原子写。[官方事务与原子性说明](https://www.mongodb.com/docs/manual/core/transactions/)。

### 19. 什么时候需要多文档事务，为什么不能把事务当成关系型建模的替代品？

**结论：只有业务不变量必须跨多个文档、集合、数据库或分片“全成或全败”时才用多文档事务。** 它提供 ACID 原子提交，但比单文档操作有更高性能与可用性代价，且有运行时和资源边界；优先通过正确嵌入、条件更新、幂等与异步补偿减少范围。事务适合转账式余额变更、库存与订单状态必须同步等窄范围临界区，不是把关系表原样搬过来的理由。

拓扑上，standalone 不支持多文档事务；副本集事务要求 FCV 4.0+，分片集群事务要求 FCV 4.2+。若任一 shard 的 `writeConcernMajorityJournalDefault` 为 `false`，该分片集群不能运行事务；跨 shard 写事务若读写到含 arbiter 的 shard，也会报错并中止。详见 [官方 Production Considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/)。

### 20. read concern、write concern 和 read preference 分别控制什么？

**结论：读关注（read concern）决定读到何种一致性/隔离级别的数据；写关注（write concern）决定写操作等待何种确认；读偏好（read preference）决定驱动把读路由到 primary 还是哪些 secondary。三者彼此独立又共同影响读己之写、延迟和可用性。**

- `readConcern: "local"` 可读节点本地最新数据，故障下可能回滚；`"majority"` 读多数提交数据。事务的跨分片一致快照还需理解 `"snapshot"` 与事务级设置。
- `w: 1` 是 primary 应用后的确认；`w: "majority"` 等待计算出的多数数据承载投票成员确认，arbiter 只影响多数票数计算而不能确认写。确认是否包含 journal 持久化还受 `j`、部署和 `writeConcernMajorityJournalDefault` 等配置影响。
- `readPreference: "primary"` 避免从 secondary 读旧数据；读 secondary 可分担读压力，但应用必须接受复制延迟、选路与读己之写边界。

来源：[Read Concern](https://www.mongodb.com/docs/manual/reference/read-concern/)、[Write Concern](https://www.mongodb.com/docs/manual/reference/write-concern/)、[Replica Set Read and Write Semantics](https://www.mongodb.com/docs/manual/applications/replication/)。

### 21. 副本集由哪些角色构成，主节点故障后如何选举？

**结论：副本集通常由一个 primary 和多个 secondary 组成，成员通过复制 oplog 保持副本；投票成员在检测 primary 不可达后发起选举，获得多数票的候选者成为新 primary。** 还可有 arbiter（只投票、不存数据）与隐藏/延迟等专用成员，但不要把它们当作承载常规业务流量的默认角色。选举期间暂时没有可写 primary，连接和正在执行的操作可能失败或被中断；驱动的拓扑发现与应用重试策略必须就绪。[官方选举流程](https://www.mongodb.com/docs/manual/core/replica-set-elections/)。

### 22. `w: "majority"` 能保证什么，不能保证什么？

**结论：`w: "majority"` 等待计算出的多数数据承载投票成员确认；arbiter 计入投票成员多数的计算，却不存数据、不能确认写。** 这里的计算结果取“全部投票成员的多数（含 arbiter）”与“数据承载投票成员数量”两者的较小值。因此在 PSA 拓扑中，可能必须让全部数据承载投票成员都可用，否则多数写会超时。

MongoDB 8.0+ 在计算出的多数数据承载投票成员将写持久记录到各自本地 oplog 后即可确认，成员异步应用该写，所以 secondary 上可能暂时尚不可见；旧版本则等待写应用到计算出的多数成员。它比 `w: 1` 更能抵御回滚，但是否 journal 持久化仍受配置影响，也不表示所有副本或外部系统已完成，不能据此承诺任意故障下零数据损失。详见 [官方 Write Concern](https://www.mongodb.com/docs/manual/reference/write-concern/)。

面试中应明确三种强度：

| 说法 | 实际含义 | 不能推导出 |
| --- | --- | --- |
| 已确认写入 | 按请求的 write concern 收到确认；若为 `w: 1`，通常是 primary 已应用 | 多数成员已确认、客户端外部操作已成功 |
| 对多数成员持久确认 | 在配置支持的多数确认和日志持久化语义下，等待相应多数确认 | 所有节点、所有系统或所有故障模型都已覆盖 |
| 任意故障下零数据损失 | 不应作为 MongoDB 的绝对承诺 | 需要明确拓扑、关注级别、journal、超时、重试和灾备边界 |

### 23. 故障切换期间客户端为什么仍需处理暂时错误、重试和幂等？

**结论：切主会中断或延迟既有请求；网络超时还会造成“服务端可能成功、客户端不知道”的不确定结果。** 驱动的 retryable reads/writes 可处理一部分暂态失败，但应用仍要对业务写设置幂等键（例如支付请求号）、唯一索引或条件更新，并区分可安全重试的操作与需要人工/业务查询确认的操作。不要仅因启用了重试就放弃超时、重复提交和外部系统补偿设计。

## 分片与扩展

### 24. 分片解决什么问题，`mongos`、config server 和 shard 分别做什么？

**结论：分片把一个集合的数据和负载分布到多个 shard，用于突破单副本集的容量或吞吐边界；它增加了路由、运维和查询设计复杂度。** `mongos` 是应用连接的无状态查询路由器；config server replica set 保存集群元数据；每个 shard 都必须部署为副本集，以提供数据冗余与故障转移。含分片键的查询可被定向到少量 shard；不含分片键的查询可能 scatter-gather 到所有 shard。

这是 [官方分片组件](https://www.mongodb.com/docs/manual/core/sharded-cluster-components/) 与 [mongos 路由](https://www.mongodb.com/docs/manual/core/sharded-cluster-query-router/) 的定义；MongoDB 8.0 起 config server 可配置为兼任保存应用数据的 config shard，不能把旧的“config server 永不存用户数据”表述当作所有版本的事实。

### 25. 好的分片键应具备哪些特征？

**结论：好的分片键同时服务最常见查询，并有足够基数、低频热点和良好分布，避免单调增长和频繁修改。** 先从线上查询形状倒推：每个关键查询是否包含分片键从而可定向路由；再用数据分布评估基数、频率和未来增长。分片键一旦投入使用，改变虽可通过 resharding 完成，仍是有成本的架构动作。[官方选择分片键指南](https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/)。

### 26. 单调递增分片键为什么可能制造写热点，hashed sharding 的代价是什么？

**结论：范围分片下递增时间戳或 `ObjectId` 的新写入会集中到最大范围的 chunk/shard；hashed sharding 可更均匀地分散写入，但牺牲按原值范围定向查询的能力。** hashed key 仍需足够高基数；如果业务经常按时间范围扫描，哈希后可能变成 scatter-gather。常见替代是带高基数前缀的复合键、按租户分布或重新设计访问路径，不能只因“热点”就盲目哈希。[官方 hashed sharding](https://www.mongodb.com/docs/manual/core/hashed-sharding/) 与 [热点排查](https://www.mongodb.com/docs/manual/core/sharding-troubleshooting-shard-keys/)。

### 27. chunk 迁移和 resharding 为什么仍需要容量、流量和故障预案？

**结论：迁移和 resharding 能重分布数据，不是无成本、无影响的开关。** 它们消耗网络、磁盘、复制和路由资源，峰值业务与长尾查询会放大影响；还需预留接收端容量，监控延迟/复制滞后/失败重试，并规划回滚或降级。上线前用接近生产的数据量和流量压测，明确迁移窗口、限流、备份恢复点和告警责任人。

## 工程追问与回答模板

### 28. 连接池、慢查询和批量写如何处理？

**结论：每个进程复用少量 `MongoClient`/连接池，设置合理超时和池上限；慢查询先观测再改索引；批量写按幂等与失败语义拆批。** 请求级新建连接会造成握手和连接风暴。慢查询需记录查询形状、耗时、返回行数、`keys/docs examined`、排序和 shard 路由，脱敏后用 `explain("executionStats")` 复现。`bulkWrite` 能减少往返，但一次过大仍会占用资源；根据错误处理需求选择 ordered/unordered，并把批次与业务幂等键对应起来。

### 29. 大文档、热点、幂等更新、数据校验和备份恢复有哪些追问？

**结论：这些问题的共同答案是“先定义上界和故障语义，再用指标验证”。**

- 大文档：测量大小与增长率，拆分历史/附件/无界数组；不要等触及 16 MiB 才处理。
- 热点：区分热文档、热索引范围、热 shard；用条件更新、计数分桶、队列或重新设计分片键分散冲突，避免把同一计数器做成全局写热点。
- 幂等更新：优先用业务唯一请求号、唯一索引、`$setOnInsert`、版本号或条件过滤，让重试不会重复扣款/扣库存。
- 数据校验：在 API 与服务层维护领域规则，在 collection validator 维护结构底线；变更 schema 时采用“先兼容读、再双写/回填、最后收紧校验”的演进路径。
- 备份恢复：备份策略必须匹配 RPO/RTO，并定期在隔离环境演练恢复、校验数据和记录耗时；有备份文件不等于已验证可恢复。

### 30. 面试口头回答如何组织？

```text
先说业务读写模式 → 再说建模或索引选择 → 说明一致性与故障边界 → 最后给 explain/指标/压测验证方法
```

例如“订单列表如何设计”：先说按租户、状态、创建时间倒序读；再给 `{ tenantId, status, createdAt, _id }` 索引和游标分页；说明 secondary 读取可能陈旧、写入确认按业务选择；最后用 `executionStats` 的扫描量、P95/P99 与分页压测验证。

## 场景速查

| 场景 | 首选思路 | 关键风险 |
| --- | --- | --- |
| 订单及固定数量订单项 | 订单项嵌入，商品主数据引用/快照 | 无界 items、价格快照被误覆盖 |
| 多租户状态列表 | 等值前缀 + 排序键复合索引，游标分页 | 深 `skip`、缺少 `_id` 造成并列不稳定 |
| 共享用户/组织实体 | 独立集合 + 引用 | `$lookup` 放大、跨文档一致性 |
| 会话与短期日志 | `expiresAt` + TTL 索引 | 把 TTL 当精确定时删除 |
| 库存扣减 | 单文档条件更新；必要时窄事务 | 重试重复执行、跨文档事务过大 |
| 读扩展 | 副本集 + 适当 read preference/concern | 复制延迟、读己之写不成立 |
| 容量与写吞吐扩展 | 围绕查询选择分片键 | 热 shard、scatter-gather、迁移资源不足 |

## 自测清单

- [ ] 能按读写模式说明嵌入与引用的收益、代价和增长上界。
- [ ] 能从等值、排序、范围和选择性解释复合索引顺序，而非只背 ESR。
- [ ] 能解释深分页为何改为稳定排序键的范围分页，并给出索引。
- [ ] 能区分单文档原子操作与多文档事务的边界和成本。
- [ ] 能说明副本集选举期间为何会暂时不可写，以及客户端的重试/幂等责任。
- [ ] 能区分读关注、写关注和读偏好，并说明 `w: "majority"` 的边界。
- [ ] 能从基数、频率、单调性和查询定向性评估分片键。
- [ ] 能解释单调键热点与 hashed sharding 的范围查询代价。
