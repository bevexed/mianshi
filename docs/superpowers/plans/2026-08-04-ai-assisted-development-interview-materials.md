# AI Assisted Development Interview Materials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `11-AI工程` 中形成一组以 Codex、Claude Code 真实使用经验为核心，并能直接用于面试复述的 AI 辅助开发材料。

**Architecture:** 通用方法、实际工具协作、真实案例、行业工具选型和面试问答各自独立成篇，由 `11-AI工程/目录.md` 统一导航。个人事实只从现有项目深挖材料提取；易变的工具能力从当前官方资料核对；未使用工具与真实使用经历通过显式标签隔离。

**Tech Stack:** Markdown、仓库内相对链接、`rg`、Git diff 检查、当前官方产品文档。

## Global Constraints

- 只有 Codex、Claude Code 可以标记为 `【真实使用】`。
- Cursor、GitHub Copilot、Windsurf、Cline、Roo Code、Aider 统一标记为 `【行业认知，未实际使用】`。
- 个人案例必须能回到 `98-项目深挖/产业互联网平台Java后端-AI协作与稳定性.md` 或 `98-项目深挖/ng-design-mcp.md`。
- 使用“结论 → 真实项目证据 → AI 做了什么 → 我做了什么 → 修正 → 取舍/边界”组织案例。
- 不编造效率百分比、覆盖率、调用次数、线上稳定性、CI 卡口或公司数据政策。
- 工具能力只引用 2026-08-04 实施时仍可访问的官方资料，并记录核对日期。
- 只修改设计指定的 `11-AI工程` 文件；不改写 `98-项目深挖` 事实源。
- 保留当前工作区已有改动；本次不提交、不推送、不创建 PR。

---

## File Map

| 文件                                              | 职责                                                   |
| ------------------------------------------------- | ------------------------------------------------------ |
| `11-AI工程/AI辅助开发实践.md`                     | 通用方法论、风险分级、验证闭环和心得                   |
| `11-AI工程/Codex与Claude Code协作实践.md`         | 两个实际使用工具的任务流程、模板和使用边界             |
| `11-AI工程/AI辅助开发真实案例.md`                 | 五个可核验案例及 30 秒、60～90 秒表达                  |
| `11-AI工程/AI开发工具生态与选型.md`               | 当前工具分类、官方能力摘要、选型维度和未使用声明       |
| `11-AI工程/AI辅助开发面试题.md`                   | 十二类面试追问、短答、证据、边界和错误说法             |
| `11-AI工程/目录.md`                               | 统一入口、标签说明和复习顺序                           |

---

### Task 1: 建立行业工具认知与选型文档

**Files:**

- Create: `11-AI工程/AI开发工具生态与选型.md`
- Reference: `11-AI工程/AI辅助开发实践.md`
- Reference: `11-AI工程/MCP协议.md`

**Interfaces:**

- Consumes: 设计稿中的事实标签和工具范围。
- Produces: 后续面试题可以引用的工具分类、选型维度和官方资料入口。

- [ ] **Step 1: 核对当前官方资料**

  对以下工具只读取官方产品或官方文档页面，记录交互形态、运行位置、上下文/Agent 能力、权限或数据策略入口，不记录未经证实的“代码质量最好”或市场排名：

  | 工具           | 官方来源范围                                  | 文档中的身份                         |
  | -------------- | --------------------------------------------- | ------------------------------------ |
  | Codex          | OpenAI 官方 Codex 文档                        | `【真实使用】`                       |
  | Claude Code    | Anthropic 官方 Claude Code 文档               | `【真实使用】`                       |
  | Cursor         | Cursor 官方文档                               | `【行业认知，未实际使用】`           |
  | GitHub Copilot | GitHub 官方 Copilot 文档                      | `【行业认知，未实际使用】`           |
  | Windsurf       | Windsurf 官方文档                             | `【行业认知，未实际使用】`           |
  | Cline          | Cline 官方文档或官方仓库                      | `【行业认知，未实际使用】`           |
  | Roo Code       | Roo Code 官方文档或官方仓库                   | `【行业认知，未实际使用】`           |
  | Aider          | Aider 官方文档                                | `【行业认知，未实际使用】`           |

  OpenAI 资料使用 `openai-docs` 工作流并仅采用官方 OpenAI 来源。其他工具优先搜索并打开各自官方文档；技术能力无法从官方来源确认时，不写入结论。

- [ ] **Step 2: 创建文档骨架并写明事实边界**

  使用以下一级结构：

  ```markdown
  # AI 开发工具生态与选型

  > 资料核对日期：2026-08-04
  > 个人实际使用：Codex、Claude Code。其他工具仅代表行业认知。

  ## 先按任务形态分类
  ## 代表性工具对照
  ## 怎么选择，而不是怎么站队
  ## 团队接入时还要看什么
  ## 面试时如何诚实回答未使用工具
  ## 官方资料
  ```

  “代表性工具对照”必须逐行包含身份标签、主要交互形态、适用任务、需要注意的边界；价格只给官方定价入口，不抄容易过期的具体数字。

- [ ] **Step 3: 写清选型维度和面试口径**

  至少解释以下维度：

  - 内联补全、对话编辑、终端 Agent、异步/云端任务的差异；
  - 上下文能否读取整个仓库，是否支持规则文件、工具调用和 MCP；
  - 本地执行、远程执行、危险命令确认、数据策略和团队治理；
  - 模型选择、成本、延迟、可回滚性和可验证性；
  - “知道工具定位”不等于“有生产使用经验”。

  面试口径使用：“我实际长期使用的是 Codex 和 Claude Code；其他工具了解其定位，但没有真实项目数据，所以只比较工作形态和选型维度。”

- [ ] **Step 4: 验证工具标签与来源**

  Run:

  ```bash
  rg -n '^## |【真实使用】|【行业认知，未实际使用】|资料核对日期|官方资料' 11-AI工程/AI开发工具生态与选型.md
  rg -n '我.{0,12}(使用|用过|接入|依赖).{0,24}(Cursor|Copilot|Windsurf|Cline|Roo Code|Aider)' 11-AI工程/AI开发工具生态与选型.md
  ```

  Expected: 第一个命令能看到所有工具的标签、核对日期和官方资料章节；第二个命令无输出。

---

### Task 2: 编写 Codex 与 Claude Code 真实协作实践

**Files:**

- Create: `11-AI工程/Codex与Claude Code协作实践.md`
- Reference: `98-项目深挖/产业互联网平台Java后端-AI协作与稳定性.md:1-140`
- Reference: `98-项目深挖/产业互联网平台Java后端-AI协作与稳定性.md:501-655`

**Interfaces:**

- Consumes: Java 项目的真实 AI 分工、任务模板、安全边界和面试追问。
- Produces: 通用实践与面试题引用的个人工具工作流。

- [ ] **Step 1: 提取允许写成第一人称的证据**

  Run:

  ```bash
  rg -n 'Codex|Claude Code|AI 帮了什么|我负责什么|任务模板|不能直接宣称|数据安全|逐文件看 diff|JUnit 5|Mockito' 98-项目深挖/产业互联网平台Java后端-AI协作与稳定性.md
  ```

  Expected: 能定位真实工具、AI/人工分工、验证方式和不能宣称的边界。

- [ ] **Step 2: 按任务阶段编写正文**

  使用以下结构：

  ```markdown
  # Codex 与 Claude Code 协作实践

  > 【真实使用】本文只总结实际使用 Codex、Claude Code 的经验。

  ## 我的核心结论
  ## 场景一：理解陌生代码库
  ## 场景二：先做方案和风险清单
  ## 场景三：小步实现和审查 diff
  ## 场景四：生成测试草案但由行为定义测试
  ## 场景五：根据真实失败输出继续诊断
  ## 长任务如何控制上下文
  ## 我不会交给 AI 自主完成的工作
  ## 可复用任务模板
  ## 复盘心得
  ## 面试表达
  ```

  不比较两个工具谁“更聪明”或固定更适合某类任务；没有使用统计时，只讲共用流程和实际案例。

- [ ] **Step 3: 加入可直接复用的任务模板**

  模板必须包含以下字段：

  ```text
  目标：可验收的业务结果。
  范围：允许修改和禁止修改的目录、文件、接口。
  现有模式：README、相似模块、异常与返回结构。
  业务不变量：权限、租户、状态、唯一性、事务、删除、兼容。
  风险：敏感数据、历史数据、并发、缓存、迁移和回滚。
  验证：测试、类型检查、编译、联调和人工检查。
  输出：先列方案与影响范围；假设必须显式标注；保持最小 diff。
  ```

- [ ] **Step 4: 验证真实使用边界**

  Run:

  ```bash
  rg -n '【真实使用】|Codex|Claude Code|最小 diff|JUnit 5|Mockito|生产|密钥|不能.*自主' 11-AI工程/Codex与Claude\ Code协作实践.md
  rg -n 'Cursor|Copilot|Windsurf|Cline|Roo Code|Aider|效率提升.*%' 11-AI工程/Codex与Claude\ Code协作实践.md
  ```

  Expected: 第一个命令能定位实际工具、验证和安全边界；第二个命令无输出。

---

### Task 3: 编写五个真实案例

**Files:**

- Create: `11-AI工程/AI辅助开发真实案例.md`
- Reference: `98-项目深挖/产业互联网平台Java后端-AI协作与稳定性.md:380-470`
- Reference: `98-项目深挖/产业互联网平台Java后端-AI协作与稳定性.md:604-640`
- Reference: `98-项目深挖/ng-design-mcp.md:1-211`

**Interfaces:**

- Consumes: 两篇项目深挖中的可核验背景、问题、修正和事实边界。
- Produces: 面试题中的项目证据入口和口述案例库。

- [ ] **Step 1: 建立五个案例的事实清单**

  Run:

  ```bash
  rg -n 'Spring Boot 3|Convert|自定义 ID|逻辑删除|主键|分类.*路径|Service|字段穿透|MCP|ChromaDB|MiniSearch|evals|需确认' 98-项目深挖/产业互联网平台Java后端-AI协作与稳定性.md 98-项目深挖/ng-design-mcp.md
  ```

  Expected: 每个计划案例都有对应事实行；带 `【需确认】` 的数字或实现细节不能被提升为确定事实。

- [ ] **Step 2: 使用统一结构编写每个案例**

  五个二级标题固定为：

  1. 进入 Spring Boot 3 多模块工程；
  2. Convert 丢失自定义菜单 ID；
  3. 逻辑删除记录导致主键冲突风险；
  4. 分类路径的 Service 与 Convert 双层验证；
  5. ng-design-mcp：把规范变成 AI 可用上下文。

  每个案例必须含：`30 秒回答`、`背景与约束`、`AI 做了什么`、`我做了什么`、`问题与修正`、`心得与边界`。

- [ ] **Step 3: 为复杂案例提供 60～90 秒展开**

  Java 菜单两个缺陷和 MCP/RAG 案例各增加一段可口述展开。Java 案例解释为什么“编译通过”不等于覆盖历史数据；MCP 案例明确项目体量和需确认项，不把两三周的小项目包装成平台级成果。

- [ ] **Step 4: 加入完整事实源链接**

  文末至少包含：

  ```markdown
  - [产业互联网平台 Java 后端：AI 协作与稳定性交付](../98-项目深挖/产业互联网平台Java后端-AI协作与稳定性.md)
  - [ng-design-mcp：UI 规范 MCP 服务](../98-项目深挖/ng-design-mcp.md)
  ```

- [ ] **Step 5: 验证案例结构和事实边界**

  Run:

  ```bash
  rg -n '^## [一二三四五、0-9]|30 秒回答|AI 做了什么|我做了什么|问题与修正|心得与边界|【真实项目】' 11-AI工程/AI辅助开发真实案例.md
  rg -n '效率提升.*%|覆盖率.*%|零线上|平台级|完全自主' 11-AI工程/AI辅助开发真实案例.md
  ```

  Expected: 五个案例结构完整；第二个命令无输出。

---

### Task 4: 扩充 AI 辅助开发通用实践

**Files:**

- Modify: `11-AI工程/AI辅助开发实践.md:1-79`
- Reference: `11-AI工程/Codex与Claude Code协作实践.md`
- Reference: `11-AI工程/AI辅助开发真实案例.md`

**Interfaces:**

- Consumes: 实际协作流程和案例中已经验证过的方法。
- Produces: AI 工程章节的总方法论入口。

- [ ] **Step 1: 保留现有原理并增加个人交付闭环**

  在“适合与不适合直接委托的工作”后加入风险分级表：

  | 风险 | 任务示例                             | AI 自主程度                         |
  | ---- | ------------------------------------ | ----------------------------------- |
  | 低   | 样板代码、文档同步、局部字段修改     | 可生成初稿，人工审查并运行基础检查  |
  | 中   | 跨层 CRUD、状态流转、树结构、缓存    | 先方案和测试清单，再分片实施        |
  | 高   | 鉴权、支付、租户、迁移、并发一致性   | 只辅助分析，关键决策和发布由人完成  |

- [ ] **Step 2: 增加从需求到交付的八步流程**

  顺序固定为：任务风险分级 → 读取仓库规则 → 检索相似实现 → 明确不变量 → 方案与影响面 → 垂直切片实现 → 分层验证 → 复盘与沉淀。

  对“分层验证”解释测试、类型检查、编译、联调和人工 diff 审查各自能发现什么，不能把一种检查描述成其他检查的替代品。

- [ ] **Step 3: 增加真实心得与反模式**

  至少写清：

  - AI 最擅长缩短定位和候选实现时间，最容易遗漏隐含业务约束；
  - 高质量输入的核心是范围、不变量、证据和完成标准，而不是华丽提示词；
  - 测试场景应来自需求和历史缺陷，不能让 AI 先看实现再生成必过测试；
  - 小 diff、可回滚和逐阶段验收比一次生成大量代码更可靠；
  - 最终责任属于提交、评审和发布代码的人。

- [ ] **Step 4: 增加专题链接**

  文末链接到协作实践、真实案例和面试题，避免在通用文档重复整段案例。

- [ ] **Step 5: 验证方法论覆盖**

  Run:

  ```bash
  rg -n '风险分级|读取仓库规则|相似实现|业务不变量|垂直切片|类型检查|编译|联调|人工.*diff|最终责任' 11-AI工程/AI辅助开发实践.md
  ```

  Expected: 每个要求概念至少有一处可定位的正文说明。

---

### Task 5: 编写面试追问链

**Files:**

- Create: `11-AI工程/AI辅助开发面试题.md`
- Reference: `11-AI工程/Codex与Claude Code协作实践.md`
- Reference: `11-AI工程/AI辅助开发真实案例.md`
- Reference: `98-项目深挖/产业互联网平台Java后端-AI协作与稳定性.md:546-602`

**Interfaces:**

- Consumes: 通用方法、个人工具流程和五个事实案例。
- Produces: 面试前可直接开口训练的问答入口。

- [ ] **Step 1: 按十二类问题建立题目结构**

  题目依次覆盖：使用价值、理解代码、上下文与幻觉、数据安全、AI 生成测试、首次实现错误、收益评估、不委托任务、Codex/Claude Code、未使用工具、责任与回滚、团队工程化。

- [ ] **Step 2: 为核心问题写 30 秒回答**

  每个回答使用三段式：

  ```text
  结论：直接回答问题。
  证据：引用一个真实项目行为或缺陷修正。
  边界：说明没有证据时不宣称什么，以及什么仍由人负责。
  ```

  数据安全、测试可靠性、真实缺陷、收益评估和责任归属必须有可直接复述的完整短答。

- [ ] **Step 3: 增加追问与翻车提醒**

  每题至少给出一个追问要点；关键题增加“不要这样说”，覆盖以下错误：AI 全自动完成、使用后固定提效百分比、测试通过就一定安全、上传全部仓库和生产日志、没用过但假装熟练、AI 出错与提交者无关。

- [ ] **Step 4: 加入口述训练方式**

  文末提供三轮训练：第一轮只答 30 秒结论，第二轮加入项目证据，第三轮接受连续追问；卡住时只回看关键词，不逐字背稿。

- [ ] **Step 5: 验证题目覆盖和事实标签**

  Run:

  ```bash
  rg -n '^## Q|数据安全|幻觉|测试|收益|Codex|Claude Code|Cursor|Copilot|责任|回滚|团队' 11-AI工程/AI辅助开发面试题.md
  rg -n '固定提升|百分之|零缺陷|完全自动|责任.*AI' 11-AI工程/AI辅助开发面试题.md
  ```

  Expected: 十二类问题均可定位；第二个命令只允许出现在“不要这样说”的反例中，必须人工逐行确认语境。

---

### Task 6: 更新 AI 工程目录

**Files:**

- Modify: `11-AI工程/目录.md:1-22`

**Interfaces:**

- Consumes: 四个新文件和扩充后的通用实践。
- Produces: 从 AI 工程目录进入所有专题的稳定相对链接。

- [ ] **Step 1: 扩充目录表格**

  表格加入四个新文件，核心内容分别写为：实际工具协作、真实案例、工具生态选型、面试追问。保留 MCP、RAG 和通用实践原入口。

- [ ] **Step 2: 增加事实标签说明**

  在目录中明确：Codex、Claude Code 是实际使用；其余工具为行业认知；`【需本人确认】` 不能在面试中按事实口述。

- [ ] **Step 3: 调整推荐顺序**

  面试优先顺序设置为：AI 辅助开发实践 → Codex/Claude Code → 真实案例 → 面试题 → 工具生态；MCP、RAG 作为项目深入追问。

- [ ] **Step 4: 检查目录链接**

  Run:

  ```bash
  rg -n 'AI辅助开发实践|Codex与Claude Code协作实践|AI辅助开发真实案例|AI开发工具生态与选型|AI辅助开发面试题|MCP协议|RAG与检索' 11-AI工程/目录.md
  ```

  Expected: 七个专题文件均可从目录定位。

---

### Task 7: 执行完整 Markdown 与事实边界验证

**Files:**

- Verify: `11-AI工程/目录.md`
- Verify: `11-AI工程/AI辅助开发实践.md`
- Verify: `11-AI工程/Codex与Claude Code协作实践.md`
- Verify: `11-AI工程/AI辅助开发真实案例.md`
- Verify: `11-AI工程/AI开发工具生态与选型.md`
- Verify: `11-AI工程/AI辅助开发面试题.md`

**Interfaces:**

- Consumes: Tasks 1-6 的全部输出。
- Produces: 可交付的文件集和实际验证证据。

- [ ] **Step 1: 核对精确文件集和 Git 范围**

  Run:

  ```bash
  git status --short -- 11-AI工程 docs/superpowers/specs/2026-08-04-ai-assisted-development-interview-materials-design.md docs/superpowers/plans/2026-08-04-ai-assisted-development-interview-materials.md
  ```

  Expected: AI 工程范围只有两个已修改文件和四个新增文件；设计稿、计划稿为新增文件；不处理其他已有脏改动。

- [ ] **Step 2: 检查本地 Markdown 链接**

  Run:

  ````bash
  python3 - <<'PY'
  import re
  import urllib.parse
  from pathlib import Path

  files = [
      Path('11-AI工程/目录.md'),
      Path('11-AI工程/AI辅助开发实践.md'),
      Path('11-AI工程/Codex与Claude Code协作实践.md'),
      Path('11-AI工程/AI辅助开发真实案例.md'),
      Path('11-AI工程/AI开发工具生态与选型.md'),
      Path('11-AI工程/AI辅助开发面试题.md'),
  ]
  missing = []
  pattern = re.compile(r'(?<!!)\[[^\]]+\]\(([^)]+)\)')
  for source in files:
      for target in pattern.findall(source.read_text(encoding='utf-8')):
          clean = target.split('#', 1)[0]
          if not clean or clean.startswith(('http://', 'https://', 'mailto:')):
              continue
          resolved = (source.parent / urllib.parse.unquote(clean)).resolve()
          if not resolved.exists():
              missing.append(f'{source}: {target}')
  if missing:
      raise SystemExit('\n'.join(missing))
  print(f'local links ok: {len(files)} files')
  PY
  ````

  Expected: `local links ok: 6 files`。

- [ ] **Step 3: 检查 Markdown 结构和空白**

  Run:

  ````bash
  python3 - <<'PY'
  from pathlib import Path

  files = list(Path('11-AI工程').glob('*.md'))
  errors = []
  fence = chr(96) * 3
  for path in files:
      text = path.read_text(encoding='utf-8')
      if text.count(fence) % 2:
          errors.append(f'{path}: unpaired code fence')
      if text.count('<details>') != text.count('</details>'):
          errors.append(f'{path}: unpaired details')
      for number, line in enumerate(text.splitlines(), 1):
          if line.rstrip() != line:
              errors.append(f'{path}:{number}: trailing whitespace')
  if errors:
      raise SystemExit('\n'.join(errors))
  print(f'structure ok: {len(files)} files')
  PY
  git diff --check -- 11-AI工程/目录.md 11-AI工程/AI辅助开发实践.md
  ````

  Expected: 所有 AI 工程 Markdown 围栏和 `<details>` 成对、无尾随空格；两个 tracked 文件的 diff 检查通过。新增未跟踪文件由上面的逐行空白检查覆盖。

- [ ] **Step 4: 检查关键语义与事实隔离**

  Run:

  ```bash
  rg -l '【真实使用】' 11-AI工程/Codex与Claude\ Code协作实践.md 11-AI工程/AI开发工具生态与选型.md
  rg -l '【真实项目】' 11-AI工程/AI辅助开发真实案例.md
  rg -n '【行业认知，未实际使用】' 11-AI工程/AI开发工具生态与选型.md
  rg -n 'Convert|逻辑删除|分类路径|ng-design-mcp|Spring Boot 3' 11-AI工程/AI辅助开发真实案例.md
  rg -n '数据安全|幻觉|测试|收益|责任|高风险' 11-AI工程/AI辅助开发面试题.md
  ```

  Expected: 两个实际工具、行业工具标签、五个案例和六类关键追问全部出现。随后人工检查所有第一人称段落，确认未使用工具没有被写成个人履历。

- [ ] **Step 5: 复核最终 diff 并交付**

  Run:

  ```bash
  git diff -- 11-AI工程/目录.md 11-AI工程/AI辅助开发实践.md
  git status --short -- 11-AI工程 docs/superpowers/specs/2026-08-04-ai-assisted-development-interview-materials-design.md docs/superpowers/plans/2026-08-04-ai-assisted-development-interview-materials.md
  ```

  Expected: 只有设计范围内的新增和修改；交付说明列出文件、验证结果，并明确“未提交、未推送”。
