# SSE 断线重传场景题 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在场景题章节新增一道可用于中高级前端面试的 SSE 断线重连与消息补发题，并接入章节目录。

**Architecture:** 采用“一题一篇”的现有结构，新建独立 Markdown 正文，围绕浏览器重连、服务端事件日志、补发与实时订阅竞态、客户端幂等去重和超出保留窗口后的全量同步展开。目录只增加一行入口，不改动其他场景题。

**Tech Stack:** Markdown、SSE/EventSource、Shell 内容断言

## Global Constraints

- 保留工作区已有未提交改动，不覆盖 `12-场景题/目录.md` 中已有的 Web 安全关联入口。
- 区分“自动重新建立连接”和“业务消息可靠补发”，不得表述为 SSE 天然保证消息不丢不重。
- 原生 `EventSource` 恢复路径使用事件 `id` 与重连请求的 `Last-Event-ID`；`retry` 只控制重连等待时间。
- 只覆盖断线恢复主线，不扩张为 SSE 与 WebSocket 的完整协议教程。
- 当前工作区存在与本任务无关的未提交内容，本计划不自动创建 Git 提交。

---

### Task 1: 编写 SSE 断线重传场景题

**Files:**
- Create: `12-场景题/SSE断线重传.md`
- Verify: Markdown 结构与技术内容人工复核

**Interfaces:**
- Consumes: `12-场景题/目录.md` 定义的“影响与止损 → 证据 → 分层假设 → 验证 → 修复与预防”答题框架。
- Produces: 独立文档路径 `12-场景题/SSE断线重传.md`，供章节目录引用。

- [x] **Step 1: 编写最小但完整的场景题正文**

正文包含以下可直接口述的内容：

1. 题目：SSE 推送期间短暂断网，恢复后出现缺消息或重复消息，要求设计断线恢复。
2. 结论：`EventSource` 自动重连不等于自动补发，可靠恢复需要事件 ID、服务端可回放日志、客户端幂等消费和过期后的快照兜底。
3. 协议报文：展示 `id`、`event`、`data`、`retry`，解释 `Last-Event-ID`。
4. 服务端流程：鉴权与流隔离、按游标回放、无缝切换到实时订阅、保留窗口、多实例共享事件源。
5. 客户端流程：单连接、按 ID 去重、幂等更新、显式关闭、错误状态展示。
6. 异常兜底：游标无效或日志过期时返回可识别信号，客户端获取快照后重新订阅。
7. 验证与监控：断网、重复、补发和实时切换竞态、多实例、保留窗口过期、重连风暴。

- [x] **Step 2: 复核正文结构与 Markdown 完整性**

Run:

```bash
test -f '12-场景题/SSE断线重传.md'
awk '/^```/{n++} END{exit n % 2}' '12-场景题/SSE断线重传.md'
rg -n '^#|^##|^###' '12-场景题/SSE断线重传.md'
```

Expected: 文件存在，代码围栏成对，标题层级与计划中的七项内容一致。

### Task 2: 接入场景题目录并做最终检查

**Files:**
- Modify: `12-场景题/目录.md`
- Verify: `12-场景题/SSE断线重传.md`

**Interfaces:**
- Consumes: Task 1 产出的稳定文档路径 `12-场景题/SSE断线重传.md`。
- Produces: 场景题目录中的可点击入口 `SSE 断线重传`。

- [x] **Step 1: 在目录表增加入口**

在现有六行场景题之后增加：

```markdown
| [SSE 断线重传](SSE断线重传.md)                 | 事件游标、断线补发、幂等去重和过期兜底     |
```

- [x] **Step 2: 执行最终验证**

Run:

```bash
rg -q '\[SSE 断线重传\]\(SSE断线重传\.md\)' '12-场景题/目录.md'
test -f '12-场景题/SSE断线重传.md'
git diff --check -- '12-场景题/SSE断线重传.md' '12-场景题/目录.md'
```

Expected: 全部 PASS，退出码为 0；目录原有 Web 安全关联入口仍存在。
