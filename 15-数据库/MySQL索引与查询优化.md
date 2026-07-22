# MySQL 索引与查询优化

索引优化的目标是减少需要读取、排序和回表的数据，而不是让 SQL “看起来用了索引”。以下默认讨论 InnoDB 与 B-tree 索引，具体执行计划受版本、数据分布和统计信息影响。

## 聚簇索引与二级索引

- InnoDB 表按聚簇索引组织，主键索引叶子页包含整行记录。
- 二级索引叶子记录包含索引列和主键值；读取索引外列通常再按主键访问聚簇索引，即“回表”。
- 查询所需列能从某个索引直接取得时形成覆盖索引，可减少回表，但更宽索引会占空间并增加写放大。

```sql
CREATE INDEX idx_user_name ON users(name);

SELECT id, name FROM users WHERE name = 'Ada'; -- 可能覆盖
SELECT * FROM users WHERE name = 'Ada';        -- 通常需要回表
```

顺序递增且较短的主键通常有利于局部性和二级索引体积，但不是绝对规则。自增插入仍可能发生页分裂，分布式 ID、写热点、可预测性和业务生命周期也要评估。

## 联合索引

联合索引 `(a, b, c)` 按三列字典序排列，可以支持其左侧前缀的查找；它不是物理上创建了三个独立索引。

```sql
WHERE a = 1
WHERE a = 1 AND b = 2
WHERE a = 1 AND b = 2 AND c = 3
```

对于 `a = 1 AND b > 2 AND c = 3`，范围构造通常在 `b` 后不能继续用 `c` 缩小连续索引区间，但 `c` 仍可能通过 Index Condition Pushdown 在存储引擎层过滤，或用于覆盖。不能简单说“c 完全没用”，应查看 `EXPLAIN` 的 `key_len`、`Extra` 和实际执行情况。

列顺序要同时考虑等值/范围条件、选择性、排序、覆盖和查询组合。优化器还可能使用 index merge、skip scan 等能力，不应只靠口诀判断。

## 常见不可搜索写法

```sql
-- 函数作用于列，普通 created_at 索引难以直接做范围定位
WHERE YEAR(created_at) = 2026

-- 改写为半开区间
WHERE created_at >= '2026-01-01'
  AND created_at <  '2027-01-01'
```

还要关注：

- 前导通配符 `LIKE '%term'` 通常不能用普通 B-tree 做前缀定位；考虑全文索引或专门搜索系统。
- 列与参数类型/字符集不匹配可能触发转换并阻碍索引；契约层保持同类型。
- `OR`、`!=`、`NOT IN` 不等于一定全表扫描，取决于选择性、NULL 语义和优化器计划。
- 低选择性列也可能因覆盖、组合条件或小范围而有价值，不能只按“性别不建索引”机械判断。
- 表达式查询频繁时可评估函数索引/生成列索引，但会增加维护成本。

## 阅读执行计划

```sql
EXPLAIN FORMAT=TREE
SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;

EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;
```

重点检查：

- 访问路径和所选 `key`，联合索引实际使用长度；
- 估算 `rows` 与 `filtered`，以及 `EXPLAIN ANALYZE` 的实际行数、循环和耗时；
- join 顺序、回表次数、排序和临时结果；
- 估算与实际差距，必要时更新统计信息或检查数据倾斜。

`ALL`、`Using filesort`、`Using temporary` 只是信号，并非必然错误。小表全扫可能最优，filesort 也可能比维护一个低收益索引更便宜。

## 分页

深 offset 需要扫描并丢弃前面记录：

```sql
SELECT * FROM orders ORDER BY id LIMIT 100000, 20;
```

稳定排序且只需向前/向后翻页时，优先 keyset pagination：

```sql
SELECT *
FROM orders
WHERE (created_at, id) < (?, ?)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

游标必须包含唯一的稳定 tie-breaker，并绑定筛选和排序条件。需要任意跳页或精确总数时仍可能使用 offset，应通过筛选、延迟关联、预计算或产品设计控制成本。

## 排查流程

1. 从慢查询、APM 和数据库指标确定高总耗时 SQL，不只看单次最慢。
2. 保存参数、数据规模、执行计划和锁等待信息。
3. 判断瓶颈是扫描、回表、排序、join、锁还是网络返回量。
4. 在接近生产的数据分布上验证索引/SQL 改写。
5. 观察写入延迟、空间和其他查询计划是否退化。

索引会增加写入、空间、备份和优化器选择成本。每个索引都应对应可说明的查询收益，并定期识别重复或长期未使用的索引。
