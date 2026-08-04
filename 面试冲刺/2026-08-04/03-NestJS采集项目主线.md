# NestJS 采集项目主线

这是整场面试最重要的项目。目标不是背完所有实现，而是把主线讲稳，再让面试官沿你准备好的钩子追问。

> 代码核验基线：私有仓库 [`bevexed/inewgrand-spider`](https://github.com/bevexed/inewgrand-spider)，`dev` 分支提交 `e1f4e52d`，核验日期 2026-08-04。下面的配置与机制均按该提交整理。
>
> 代码可以证明“实现了什么”，不能证明真实日任务量、成功率、性能提升比例或公司已经完成法务授权。当前仓库实现的是采集、恢复、身份池、验证码与落库；资质比对、合规判断、到期预警和通知模块仍是空模块。

## 2 分钟主叙述

> 这是一个面向公开企业资质数据的采集服务，负责采集并标准化企业、资质和注册人员事实，为后续资质比对、到期预警和内部合规判断提供数据输入。技术栈是 NestJS 11、Fastify 和 TypeScript，用 BullMQ 与 Redis 做任务派发和延迟调度，TypeORM 与 MySQL 保存业务数据及任务事实，Playwright 处理浏览器会话，最后通过 Docker 和 K8s 部署。
>
> 这个服务由我从 0 到 1 负责。数据采集不是一次 HTTP 请求就能结束，而是先抓企业详情，再并行派生企业资质和人员列表；人员列表首页拿到总数后继续派生剩余分页与必要的人员详情任务。所以我拆成四类队列，由 Worker 在运行时派生下一级任务。数据库里的任务记录是业务事实来源，BullMQ 负责派发，这样任务失败、重复或进程重启时仍能追踪和恢复。
>
> 我遇到的核心问题有三类。第一是任务幂等、失败重试和恢复，需要同时考虑派生侧、队列侧和业务写入侧；第二是代理与会话这类有状态资源在并发下的竞态；第三是分页采集完成后如何通过轮次、预期页集合、目标端总数和稳定业务键确认数据完整。
>
> 这个项目让我从“功能能运行”转向先定义状态、失败路径和恢复策略，再写业务代码。

说到这里停下，让面试官选择“队列、幂等、竞态、数据一致性”中的一个方向。

## 架构图

```text
Cron / 手动 produce
        ↓
     Producer
        ↓
company_detail
  ├─ company_cert（内部全量翻页）
  └─ staff_list_page(0)
       ├─ staff_list_page(1..N-1)
       └─ staff_detail（有效期回填与补漏）

每类 Processor ── BullMQ / Redis：派发、并发、延迟
              └─ MySQL：crawler_task、crawl_run、page_task、业务事实表
```

四个实际队列名是：

- `mohurd-company-detail`
- `mohurd-company-cert`
- `mohurd-staff-list-page`
- `mohurd-staff-detail`

当前实现使用四个独立 Processor 手动派生下一级任务，没有使用 `FlowProducer`。原因是任务数量要等运行时拿到分页总数后才能展开，而且业务数据库还要保留可查询、可补偿的任务事实。当前部署是 all-in-one 单进程、单副本，多 Pod 治理尚未完成。

## 高频追问

### 1. 为什么不用一个循环直接抓？

> 任务树会逐级展开，整体耗时不适合绑在一次 HTTP 请求上；采集又会遇到网络超时、限流和代理失效。队列把任务拆成可独立恢复的单元，还能提供并发、延迟和状态管理。循环适合短小、可一次完成的任务，这里的主要约束是长耗时和可恢复性。

追问准备：如果任务量很小，会不会不用队列？答：会，复杂度必须由实际失败与恢复需求支撑。

### 2. 为什么选 BullMQ，不选 Kafka/RabbitMQ？

> 项目已有 Redis，主要需要的是任务派发、延迟、并发和执行状态，而不是复杂消息路由或多消费组回放。BullMQ 与 Node/NestJS 集成直接，新增运维面也小。业务重试计数由 MySQL 任务表维护，避免 BullMQ 与数据库各算一套。Kafka、RabbitMQ 不是不能做，而是当前约束下收益不足。我没有把对它们的机制了解包装成生产经验。

### 3. 幂等怎么保证？

> 我按“派生、队列、消费”三层处理。派生任务先写 MySQL 任务表，`bizKey` 唯一索引配合 `INSERT ... IGNORE` 挡住重复；BullMQ 使用同一业务键转义后的稳定 `jobId` 做第二层去重；Worker 重复收到已完成任务时直接跳过，业务表最终再按自身唯一键 upsert 或原子更新。前两层减少重复执行，最后一层守住结果一致。

实际任务键如下：

| 任务 | `bizKey` | 作用域 |
| --- | --- | --- |
| 企业详情 | `company_detail:{上海时区业务日期}:{qyId}` | 同企业同一天一次 |
| 企业资质 | `company_cert:{runId}:{qyId}` | 同轮次同企业一次 |
| 人员列表页 | `staff_list_page:{runId}:{pageNo}` | 同轮次同一 API 页一次，`pageNo` 从 0 开始 |
| 人员详情 | `staff_detail:{runId}:{ryId}` | 同轮次同一人员一次 |
| 有效期补漏 | `staff_validity_refill:{runId}:{ryId}` | 与普通详情任务分键，同轮次最多补一次 |

已核实的实现细节：

- `xyh_qualif_crawler_task.bizKey` 有唯一索引 `uq_xyh_qualif_crawler_task_bizkey`，写入使用 TypeORM QueryBuilder 的 `.orIgnore()`，不会把已有 `processing/done` 任务重置为 `pending`。
- BullMQ `jobId` 确实来自同一个 `bizKey`，但因为自定义 `jobId` 不能含冒号，代码先执行 `encodeURIComponent(bizKey)`。
- 企业按 `qyId` upsert；企业资质按平台 `aptId` upsert。
- 人员使用 RowKey V3：对 `['v3', regQyid, ryId, regType, 标准化专业名]` 做 SHA-256，`rowKey` 有唯一索引。写入先保证槽位存在，再逐槽位做数据库原子更新，空值不会覆盖已有非空值；同槽位关键字段冲突会阻断，而不是让最后写入者静默覆盖。

边界：这是“至少一次投递 + 多层幂等”，不是端到端 exactly-once。

### 4. 为什么先写数据库再入队？中间崩了怎么办？

> 写库和入队不是一个原子事务。先入队后写库可能产生无法追踪的幽灵任务；当前实现先用 `bizKey` 幂等写入 `crawler_task`，再入 BullMQ。入队失败时数据库仍有 `pending` 行，下一轮 Producer 会扫描并用原稳定 `jobId` 补投。队列里已有 waiting、active 或 delayed Job 时会被 BullMQ 去重；若保留的是 failed/completed Job，则调用 BullMQ 的原子 `job.retry` 重启。

补偿扫描已经实现，不是设计建议。生产 K8s 配置中的 Producer 每 5 分钟运行一次，流程会先回收/恢复任务，再同步种子并派发新企业。父任务也遵守“派生子任务先严格入表，再把父任务置 done”，避免进程在两步之间退出后丢失整棵子任务树。

边界：项目没有用事务 Outbox，MySQL 与 Redis 仍不是强一致；可靠性来自“先留底 + 稳定键 + 周期补偿 + 消费幂等”。

### 5. 所有错误都重试吗？

不要回答“指数退避、1/4/16 秒、404 永久失败”，当前代码不是这样。

> BullMQ 自身配置 `attempts: 1`，不负责业务重试。MySQL 任务表默认 `maxRetry=3`：第一次、第二次失败分别把 `retryCount` 加到 1、2，并把当前 Job 固定延迟 5 秒；第三次失败把任务置为 `failed`。身份池只是全忙时延迟 2 秒，没有新鲜身份时延迟 30 秒，这两种资源等待不增加业务重试次数。
>
> 请求层只对“代理连接失败”和“单次请求超时”原地重试，间隔 5 秒，最多重试到当前身份/IP 的真实 TTL 截止；其他业务或解析异常直接冒泡到任务层。借入身份上下文中遇到 408/777，会报废该身份并让任务重投。信用代码解析明确查无企业时，种子同步单独写 `not_found` 哨兵，避免下轮重复查询。

当前边界要主动说清：

- 任务层没有通用的“可重试/永久失败”异常分类；解析错误、非 2xx 和普通业务异常通常都会走同一套任务重试。
- 没有指数退避或抖动，当前是固定延迟。
- Producer 下一轮会把所有 `failed` 任务的 `retryCount` 清零并复活，因此 `maxRetry=3` 只限制单轮，生命周期上可能无限循环。仓库版本记录已把“总重试上限”列为待完善项。
- 当前没有配置 BullMQ `limiter`；真实压力主要由队列并发、固定身份槽位、分页大小、验证码并发和代理熔断共同约束。

### 6. Worker 或 Pod 执行到一半挂了怎么办？

> 队列侧仍有 BullMQ Worker 的锁和 stalled 恢复机制；业务侧的关键补偿是 Producer 周期扫描数据库中的 `pending` 任务，再用稳定 `jobId` 补投，所以即使 Redis 中的 Job 丢失，MySQL 留底仍能重新驱动。业务写入按唯一键幂等，重复执行不会制造重复结果。

实际优雅退出已经做到：

- `main.ts` 调用了 `app.enableShutdownHooks()`。
- 浏览器会话和代理服务实现了 `OnModuleDestroy`，会关闭 Browser/Context、undici dispatcher 和本地转发代理。
- K8s 设置 `terminationGracePeriodSeconds: 30`。

但不要过度声称：仓库没有自定义的 Worker `pause → 等待全部在途任务 → close` 流程，也没有自定义 stalled 参数。`crawler_task` 确实实现了 `processing + lockedUntil` 和 5 分钟超时回收方法，但当前 BullMQ Processor 路径只按 `bizKey` 找行并记录 `startedAt`，没有调用 `claimNext` 把任务置为 `processing`；`MOHURD_TASK_LEASE_MS` 也没有传入该路径。因此面试时应把“数据库 5 分钟租约回收”说成已有能力但尚未完整接到当前消费路径，主要恢复仍是 BullMQ 默认机制与 Producer 的 pending 补投。

### 7. 队列状态和数据库状态谁是真相来源？

> BullMQ 状态适合派发和短期执行观察；业务查询、阶段完成、对账和长期恢复以 `crawler_task`、`crawl_run`、`page_task` 为准。两者不是强一致，所以代码明确了允许的中间状态，并通过先留底、稳定 `jobId`、周期补投和幂等消费收敛。

### 8. 并发度怎么定？

> 当前把并发能力绑定到固定代理身份池，而不是只看本机 CPU。配置是 3 个出口，每出口 2 个 A_TOKEN 槽位、4 个 B_IP 槽位。企业详情、企业资质、人员列表三个 A 类队列各配置并发 6；它们共用 6 个 A_TOKEN 身份，所以实际 A 类网络并发总量仍受共享身份池限制为 6。人员详情 B 类队列并发是 12。Playwright 刷 token 的全局并发是 2。

生产清单中的相关值：

- `MOHURD_EXIT_COUNT=3`
- `MOHURD_A_SLOTS_PER_EXIT=2`
- `MOHURD_B_SLOTS_PER_EXIT=4`
- `MOHURD_TOKEN_REFRESH_CONCURRENCY=2`
- `MOHURD_PRODUCE_BATCH_SIZE=3`
- 单次 fetch 超时 30 秒，人员列表每页 15 条，最多 200 页。

选择依据能从代码证明的是容量模型和风控约束：A 槽位过高更容易触发 777，B 类按纯 IP 槽位控制，代理还有日消耗保护和人工熔断。仓库没有成功率/限流率随并发变化的压测曲线，因此不要编造“从多少调到多少、成功率提升多少”。

### 9. 代理竞态的真实现象、根因和修复是什么？

可以讲两个代码中有测试证据的问题：

> 第一个问题是“IP 到期了还在用”。某个进程较晚才跟随 Redis 里已经接近过期的共享出口，旧实现却把本进程的跟随时刻当成 IP 诞生时刻，相当于错误续命。修复后读取 Redis `PTTL`，用剩余 TTL 反推出真实 `selectedAt`；轮换时用 Redis Lua 做 compare-and-delete，只有共享出口仍等于本进程要放弃的旧值，才原子删除出口 key 和绑定的 accessToken，避免误删别的实例刚写的新值。
>
> 第二个问题来自并行刷 token。账密代理下 Chromium 不能稳定完成上游 407 协商，项目用本地无鉴权转发代理注入认证头；原来只有一个转发代理实例，一个出口重建或关闭它时，会误伤另一个仍在使用的浏览器。修复是按上游出口把转发代理池化，每个出口使用独立本地端口，只清理自己的成员；限流 key、Browser Context key 和转发代理池 key 统一使用出口指纹。

身份池借用本身不是 Redis fencing token 方案，而是 MySQL 事务配合 `SELECT ... FOR UPDATE SKIP LOCKED`，同事务写 `in_use/lockedBy/lockedAt` 和出口轮转时间；身份租约 2 分钟、IP 新鲜窗口 4.5 分钟。当前没有版本号或 fencing token，也没有一套通用的“请求前版本复核”协议，不要把这些改进建议说成已经上线。

### 10. 怎么证明数据抓全了？

> 人员列表首页必须拿到可信 `total`，否则任务直接失败。代码按每页 15 条算出预期页集合，先在 `page_task` 中全量登记为 `pending`，每页成功落库后置 `done`；所有 `staff_list_page` 任务都完成后才能封口列表阶段。企业收尾时还会把平台声明的人员总数与数据库当前有效 RowKey V3 槽位数做硬校验，不一致就把企业置为 `failed`，避免漏行后静默完成。

实际对账和软删除规则：

- `crawl_run.runKey` 复用 `company_detail.bizKey`，同一来源任务重试不会重复开轮次。
- `page_task` 唯一键是 `(runId, taskType, pageNo)`；当前人员列表按页留底，保存页状态，不保存“本页实际条数”。
- 人员 RowKey V3 是“企业 + 人员 + 注册类别 + 标准专业”的当前槽位键；资质以 `aptId` 去重。
- 人员列表所有页成功后，代码立即把 `crawledAt < run.startedAt` 且仍为有效的旧槽位置 `delete=1`，只做假删除不物理删除；后续完整轮次再次出现时 upsert 会把它复活为 `delete=0`。当前没有“连续 N 轮未出现才软删除”的规则。
- 列表封口前还会扫描本轮出现但有效期仍为空的人员，派生一次独立的 `staff_validity_refill` 补漏任务，兜住跨页并发导致的详情回填时序问题。
- 人员 expected/actual 不一致会阻断完成；资质 expected/actual 不一致目前只写告警，不阻断企业完成，这是现有边界。

### 11. Redis 内存会不会一直涨？

> 当前 BullMQ 配置是 `removeOnComplete: true`、`removeOnFail: 1000`、`attempts: 1`。成功 Job 立即清理，失败 Job 最多保留 1000 条用于排查；长期任务事实和耗时保存在 MySQL，而不是依赖 Redis 保存全部历史。

当前已有的观测能力：

- `crawler_task` 保存 `startedAt/finishedAt/durationMs/retryCount/errorMessage`。
- `crawl_run` 保存整轮阶段状态和耗时，`page_task` 保存分页完成状态。
- token 获取日志、代理出口日志、接口耗时日志、可选验证码 trace 和 Sentry。
- 代理侧有日消耗分级保护、`manual-halt` 人工熔断及 Sentry 告警。

当前缺口：没有找到 Bull Board、Prometheus、队列深度/最老 Job 年龄/永久失败率的专门指标或告警；`/api/health` 也只是返回静态 `ok`，没有探测 MySQL、Redis 或 Worker 健康。面试时可以把这些作为下一步运维完善项，不要说已经有完整队列看板。

### 12. 合规性怎么回答？

> 数据源是公开政务平台，采集层只保存后续业务所需的最小事实字段。工程上通过固定并发、15 条小分页、代理消耗熔断和默认关闭本地定时采集来控制压力；accessToken、代理凭证、VLM key 和数据库密码不写入日志或响应；身份证只保存平台已经掩码的内容，任务 payload 只传前六位与末两位组合提示，不传完整掩码原文。

边界必须明确：

- 仓库只能证明上述工程控制，找不到公司法务审批、数据授权书或正式合规评估材料，所以不能声称“已经通过法务/取得正式授权”。
- 资质比对、合规判断、预警与通知当前未实现，不能说采集服务本身已经完成合规判定闭环。
- 代码默认 `SENTRY_SEND_DEFAULT_PII=false`，但当前生产 K8s 清单显式配置为 `SENTRY_SEND_DEFAULT_PII=true`。因此不要声称“生产 Sentry 默认不发送 PII”；这项配置应另行做合规复核。
- 会话与验证能力描述为“稳定完成公开页面的数据流程”，不要用“绕过风控”表述。

## 30 秒收束

如果项目被问太久，用这句话收回来：

> 这个项目最重要的不是用了多少组件，而是让我建立了一个习惯：先把状态、非法转换、失败路径和恢复方式画清楚，再写执行流程。后来处理复杂前端表单和跨页面状态时，我也在使用同一套“单一事实来源”思路。

## 代码已核验结论

- [x] 四个队列及任务派生链路。
- [x] 五种业务键、任务表唯一约束、稳定 `jobId` 和业务表写入键。
- [x] BullMQ `attempts=1`，任务表单轮最多 3 次，固定 5 秒重试；身份等待 2 秒/30 秒。
- [x] Producer pending 补投、failed 复活和稳定 Job 原子重启。
- [x] 当前并发：A 类共享上限 6、B 类 12、刷 token 2。
- [x] shutdown hooks、资源清理和 K8s 30 秒终止窗口；自定义 Worker drain/stalled 配置未实现。
- [x] 两类代理竞态及实际修复；Redis Lua CAS 存在，但没有 fencing token/版本号。
- [x] 分页预登记、人员总数硬校验、RowKey V3、立即假删除与后续复活。
- [x] `removeOnComplete=true`、`removeOnFail=1000`；已有结构化日志/Sentry，但没有完整队列指标看板。
- [x] 仓库不能证明真实业务指标或正式法务授权，面试中不说未经证实的数字和结论。

## 代码证据速查

- 队列与清理：`src/queue/queue.module.ts`、`src/queue/queue.constants.ts`
- 业务键与派发：`src/jobs/processors/task-biz-keys.ts`、`src/jobs/mohurd-task-dispatcher.service.ts`
- 重试与补偿：`src/jobs/processors/mohurd-base.processor.ts`、`src/jobs/mohurd-producer.service.ts`、`src/crawler/mohurd/persistence/mohurd-task-queue.service.ts`
- 并发：`src/jobs/processors/resolve-queue-concurrency.ts`、`k8s/all-in-one.yaml`
- 数据对账：`src/jobs/mohurd-completion.service.ts`、`src/jobs/processors/staff-list-page.processor.ts`、`src/crawler/mohurd/persistence/mohurd-run-tracker.service.ts`
- RowKey V3 与软删除：`src/crawler/mohurd/persistence/mohurd-persistence.service.ts`、`src/crawler/mohurd/entities/registered-staff.entity.ts`
- 代理竞态：`src/crawler/mohurd/proxy/mohurd-proxy.service.ts`、`src/crawler/mohurd/proxy/mohurd-proxy.service.spec.ts`、`docs/architecture-evolution.md`
- 合规与当前边界：`README.md`、`src/instrument.ts`、`k8s/all-in-one.yaml`
