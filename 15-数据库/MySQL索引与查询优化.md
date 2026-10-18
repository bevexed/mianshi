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

### 场景追问：索引是什么？为什么能加速查询？普通索引和唯一索引有什么区别？

**面试官：** 百万企业表按 `credit_code` 查询很慢，你会怎么分析、怎样建索引？

**口语参考答案：**

> 我会先看实际 SQL、参数和 EXPLAIN，确认时间花在扫描、回表还是其他环节。如果信用代码是必填且业务唯一，可以在清理重复数据后建立非空唯一索引。InnoDB 常见索引采用 B+ 树，通过有序结构缩小访问范围，减少全表扫描。普通索引允许重复，唯一索引还约束非 NULL 值的唯一性。索引需要占空间并在写入时维护，所以要根据查询模式设计，最后用执行计划和接近真实的数据量验证收益。

```sql
EXPLAIN SELECT id, name FROM enterprise WHERE credit_code = ?;
CREATE UNIQUE INDEX uk_enterprise_credit_code ON enterprise (credit_code);
```

**追问与易错点：** MySQL 唯一索引允许多个 NULL；需要必填唯一时还应设 `NOT NULL`。建了索引不代表优化器一定选择它。

## 联合索引

联合索引 `(a, b, c)` 按三列字典序排列，可以支持其左侧前缀的查找；它不是物理上创建了三个独立索引。

```sql
WHERE a = 1
WHERE a = 1 AND b = 2
WHERE a = 1 AND b = 2 AND c = 3
```

对于 `a = 1 AND b > 2 AND c = 3`，范围构造通常在 `b` 后不能继续用 `c` 缩小连续索引区间，但 `c` 仍可能通过 Index Condition Pushdown 在存储引擎层过滤，或用于覆盖。不能简单说“c 完全没用”，应查看 `EXPLAIN` 的 `key_len`、`Extra` 和实际执行情况。

列顺序要同时考虑等值/范围条件、选择性、排序、覆盖和查询组合。优化器还可能使用 index merge、skip scan 等能力，不应只靠口诀判断。

### 场景追问：联合索引和最左前缀原则是什么？

**面试官：** 索引 `(province, city, status)`，查 province、province 加 city、仅 city、province 加 status，分别怎样利用？

**口语参考答案：**

> 联合索引按列顺序做字典序排列，先省份，再同省内城市，再同城市内状态。province 和 province 加 city 能利用连续左侧前缀定位；仅 city 通常缺少高效定位的前缀；province 加 status 能先按 province 缩小范围，但跳过 city 后，通常不能把 status 继续用于同一段连续查找。后续列仍可能参与索引条件下推或覆盖，不能简单说完全没用。最终根据真实 SQL、数据分布和 EXPLAIN 判断。

**追问与易错点：** SQL 中条件书写顺序不必与索引列顺序相同。优化器可能选择 skip scan 或全索引扫描，“用了索引”不等于“扫描很少”。

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

### 场景追问：MySQL 深分页为什么慢？Offset 和 Cursor 怎么选？

**面试官：** 为什么 `LIMIT 199980, 20` 可能很慢？`id > 199980` 就等于第一万页吗？需要任意跳页怎么办？

**口语参考答案：**

> 深 Offset 通常仍需扫描并丢弃前面大量记录，即使最后只返回二十条也有成本。连续翻页可以保存上一页最后一条的排序键，用范围条件从那个位置继续查，配合索引减少跳过的扫描。游标必须来自上一页真实结果，不能把偏移数量当成主键 ID，因为 ID 可能有空洞，数据也有筛选。需要任意跳页时，Offset 更直接，可以结合筛选、覆盖索引或延迟关联控制成本；不能宣称游标天然支持直接跳到未知位置。

```sql
SELECT id, name
FROM enterprise
WHERE id > ?
ORDER BY id ASC
LIMIT 20;
```

**追问与易错点：** 按时间排序时使用 `(created_at, id)` 组合游标并绑定筛选条件。游标分页不自动提供严格快照；旧记录更新、删除或排序键变化仍需定义一致性。

## 关联查询与分组统计

### 场景追问：INNER JOIN 和 LEFT JOIN 有什么区别？

**面试官：** 查询全部企业及证书，包括没有证书的企业，应该怎么写？

**口语参考答案：**

> INNER JOIN 只保留两边满足关联条件的记录；LEFT JOIN 保留所有左表记录，右边没有匹配时返回 NULL。要保留没有证书的企业，我会把 enterprise 作为左表，再 LEFT JOIN certificate。一家企业有多张证书，SQL 结果可能有多行，不能把结果行数直接当成企业数量。如果还要筛选右表证书，应判断条件放在 ON 还是 WHERE，避免无意中删掉那些没有证书的企业。

```sql
SELECT e.id, e.name, c.certificate_name
FROM enterprise AS e
LEFT JOIN certificate AS c ON c.enterprise_id = e.id;
```

**追问与易错点：** `WHERE c.status = 'valid'` 会排除右表为 NULL 的记录；如果要保留全部企业并仅关联有效证书，可把该筛选放进 `ON`。

### 场景追问：GROUP BY、COUNT 和 HAVING 怎么配合？

**面试官：** 统计每家企业的证书数量，没有证书显示零；再筛选证书数量大于一的企业。

**口语参考答案：**

> 我会先 LEFT JOIN 保留所有企业，再按企业分组，用 COUNT(c.id) 统计证书。COUNT 的列参数不计 NULL，所以没有匹配证书时是零；COUNT(\*) 会统计 LEFT JOIN 保留的那一行，结果就可能错误地变成一。WHERE 在分组前过滤行，HAVING 在分组后过滤聚合结果，因此证书数大于一放在 HAVING 里。

```sql
SELECT e.id, e.name, COUNT(c.id) AS certificate_count
FROM enterprise AS e
LEFT JOIN certificate AS c ON c.enterprise_id = e.id
GROUP BY e.id, e.name
HAVING COUNT(c.id) > 1;
```

**追问与易错点：** 查看所有企业的数量时移除 HAVING；同时 JOIN 多组一对多关系会重复放大计数，需要预聚合或按业务使用 `COUNT(DISTINCT ...)`。

## 排查流程

1. 从慢查询、APM 和数据库指标确定高总耗时 SQL，不只看单次最慢。
2. 保存参数、数据规模、执行计划和锁等待信息。
3. 判断瓶颈是扫描、回表、排序、join、锁还是网络返回量。
4. 在接近生产的数据分布上验证索引/SQL 改写。
5. 观察写入延迟、空间和其他查询计划是否退化。

索引会增加写入、空间、备份和优化器选择成本。每个索引都应对应可说明的查询收益，并定期识别重复或长期未使用的索引。
