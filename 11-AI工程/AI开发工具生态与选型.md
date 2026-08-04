# AI 开发工具生态与选型

> 资料核对日期：2026-08-04
> 个人实际使用：Codex、Claude Code。其他工具仅代表行业认知。

这是一份用于建立选型语言和面试边界的资料，不是工具排行或采购结论。下文只记录官方资料能够确认的交互、运行位置、上下文和权限入口；“支持”不等于默认启用，也不等于适合把生产权限交给 Agent。

## 先按任务形态分类

工具名称不是工作形态。先把任务拆成下列四类，再看所在团队的编辑器、代码托管、模型和安全边界是否匹配：

| 任务形态 | 典型交互 | 适合解决的问题 | 需要先问清的事 |
| --- | --- | --- | --- |
| 内联补全 | 在编辑器当前光标附近给出候选代码 | 小范围样板、重复 API 调用、局部表达式 | 当前文件或排除文件是否会进入上下文；接受建议前是否能看懂 diff |
| 对话编辑 | 选中代码或在 IDE 侧栏描述修改，查看并应用 diff | 解释局部代码、跨少量文件重构、逐步修改 | 修改范围、自动应用和终端执行是否需要确认；规则文件如何生效 |
| 终端 Agent | 在仓库目录中对话，读取文件、编辑并运行命令 | 需要结合 Git、测试、构建输出的排查和实现 | 目录/网络/命令权限、危险命令确认、脏工作区和回滚方案 |
| 异步/云端任务 | 把任务交给远程环境，稍后查看状态或 PR | 可隔离、可等待的长任务或并行探索 | 代码、密钥和网络在哪个环境中；运行时权限、保留策略、人工验收点 |

同一产品可能覆盖多种形态。例如，IDE 内的 Agent 并不天然等于“只在本地运行”，而云端 Agent 也不等于“可以免审查合并”。分类的目的，是先确认执行面与责任边界。

## 代表性工具对照

| 工具与身份 | 主要交互形态 / 运行位置 | 适用任务 | 上下文、Agent 与扩展入口 | 需要注意的边界 |
| --- | --- | --- | --- | --- |
| Codex【真实使用】 | 终端优先的本地仓库工作，也有桌面、IDE 与云端执行面 | 阅读和修改仓库、运行验证、代码审查与可隔离的长任务 | 可通过 `AGENTS.md` 叠加仓库规则；本地客户端可配置 MCP；Agent 可读写文件和调用工具，实际能力由当前表面与配置决定 | 本地 CLI/IDE 的沙箱、网络和审批策略要单独配置；云端环境与本机隔离，仍要检查任务的网络、密钥与 diff。 |
| Claude Code【真实使用】 | 在开发机终端启动的交互式 CLI，也可用非交互命令进入脚本流程 | 仓库理解、实现、调试、测试和终端协作 | 官方 CLI 提供会话、模型、权限模式与 `claude mcp` 配置入口；项目说明和 MCP 的具体效果以当前配置为准 | `--dangerously-skip-permissions` 会跳过权限提示，不能作为常规团队默认；需核对所选部署/API、凭据和数据使用策略。 |
| Cursor【行业认知，未实际使用】 | IDE 侧栏 Agent、Ask 与自定义模式；另有远程异步 Background Agents | 编辑器内的问答、多文件修改、终端协作；适合异步的隔离任务时可使用后台形态 | Agent 可搜索代码库、编辑和运行终端；官方文档列出 Rules、MCP 与自定义模式入口 | Background Agent 在隔离远程机器中运行且可联网、自动运行命令；需单独核对 Privacy Mode、代码保留与 GitHub 授权。 |
| GitHub Copilot【行业认知，未实际使用】 | IDE 内联建议与 Chat/Agent；也有 CLI、GitHub 网页和 cloud agent 等表面 | 贴近 GitHub 工作流的补全、对话、代码审查和交办任务 | 官方文档提供 IDE/CLI 的 MCP 配置与组织策略入口；可按表面启用或限制功能 | 企业策略并非对所有表面都同样适用；content exclusion 也有表面与语义信息限制，接入前要按实际编辑器和 Agent 模式验证。 |
| Windsurf【行业认知，未实际使用】 | 编辑器内的 Cascade 对话/代码模式，官方当前文档亦说明其与 Devin Desktop 的关系 | 编辑器内编写、解释、终端协作、检查点回退和工作流自动化 | Cascade 文档列出规则、记忆、MCP、终端和工具调用入口；MCP 工具可以逐项启用 | 官方文档将部分 Cascade MCP 配置标为 legacy，并说明新标签页默认 Agent 不同；选型时须以当前产品/版本文档确认执行位置、保留和审批策略。 |
| Cline【行业认知，未实际使用】 | IDE 内 Plan/Act 交互，也有终端 CLI | 先规划再实施的仓库修改、命令执行、浏览器或 MCP 协作 | 官方文档提供项目读写、命令、浏览器和 MCP 的逐类 Auto Approve 设置 | 默认逐操作审批和 Auto Approve/YOLO 的风险差异很大；YOLO 可批准文件、命令、浏览器和 MCP 操作，应仅在隔离且可回滚的环境评估。 |
| Roo Code【行业认知，未实际使用】 | VS Code 中的 Code、Ask、Architect、Debug、Orchestrator 等模式 | 在编辑器内按“只读解释—规划—实现—排障”切换职责 | Mode 可限制 `read`、`edit`、`command`、`mcp` 工具组；MCP 支持全局与项目级配置 | Mode 的工具组和文件限制是配置项，不能把模式名称当作安全保证；项目级 MCP 可能进入版本控制，密钥与 allowlist 要另行治理。 |
| Aider【行业认知，未实际使用】 | 终端中的本地 Git 仓库结对编程 | 以 Git diff 为中心的修改、审查与回退 | 用 repository map 提供跨仓库符号概要；可把指定文件加入对话上下文 | 官方默认 Git 行为可能在编辑前处理已有脏改动，并可自动提交；使用前应确认是否要关闭自动提交、是否运行 hook，以及模型提供方的数据策略。 |

表中没有“哪个更聪明、更快或更便宜”的结论：这些结论需要用本团队固定任务集、实际权限配置、模型版本和成本账单验证，不能从一次演示或品牌印象推出。

## 怎么选择，而不是怎么站队

可以按同一张检查单比较候选工具；先满足安全和可验证性，再比较交互便利性。

1. **任务与交互。** 光标附近的补全、对话式改 diff、能执行命令的终端 Agent、远程异步任务，风险面不同。需要运行测试或查看日志时，优先评估终端/Agent 的权限与回显；只需局部建议时，不必扩大到全仓库 Agent。
2. **上下文与扩展。** 问清它读取的是当前文件、选中内容、索引/仓库地图，还是可继续搜索整个仓库；规则文件能否被发现、是否可审查；工具调用和 MCP 是否存在、可否按服务器或工具 allowlist。能读整个仓库只说明潜在上下文范围，不保证每一轮都正确理解。
3. **执行与权限。** 区分本地执行、远程执行和本地 UI 调远程 Agent。把读、写、终端、网络、浏览器、MCP、Git 托管授权分别列出；对删除、依赖安装、生产连接、提交和推送保留明确确认。危险命令确认不能用“自动模式”一笔带过。
4. **数据与治理。** 从官方隐私/安全页确认代码、提示、遥测和任务历史的处理方式，并确认团队计划、管理员策略、审计和内容排除在所用表面是否生效。MCP 和第三方工具还要看自己的凭据、服务端和数据边界。
5. **模型、成本与延迟。** 只比较本团队可用的模型、计费方式、配额、等待时间和并发限制；价格数字会变化，因此以各产品的官方定价入口和当前合同为准。模型可选不等于每个模式、地区或企业策略都可用。
6. **可回滚与可验证。** 要求变更能以 diff、提交或检查点被审查/回退；固定执行类型检查、lint、测试和必要的人工验收。工具输出是候选实现，不是质量证明。

一个可执行的最小试点是：选 3–5 个可复现任务，记录完成条件、允许的上下文和权限、执行日志、diff、测试结果、人工接管次数、耗时与实际成本；再在相同条件下比较。不要把不同模型、不同权限或不同难度任务混成单一“效率”数字。

## 团队接入时还要看什么

| 层面 | 接入前确认 | 最小治理动作 |
| --- | --- | --- |
| 仓库上下文 | 哪些目录可读写、规则文件与忽略文件在哪、是否有敏感配置 | 提供可审查的项目规则；把密钥排除在仓库和提示上下文之外 |
| 工具与 MCP | 服务器来源、传输方式、OAuth/令牌范围、可调用工具 | 从只读、最小权限开始；记录批准的服务器/工具并要求写操作确认 |
| 执行环境 | 本地或远程、网络、依赖安装、分支和工作树策略 | 使用隔离分支/工作树或沙箱；限制外网和生产凭据；保留日志与 diff |
| 质量门槛 | 谁审查、哪些检查必须运行、失败如何回滚 | AI 变更与人工变更走同一 PR、测试和 review 门槛；把验收命令写入规则 |
| 组织治理 | 计划、管理员策略、审计、数据保留和培训 | 先用小范围试点验证实际表面；对策略例外、供应商变更和提示注入保留复核流程 |

这里的核心不是把“允许 Agent”变成一次性开关，而是把可读取的上下文、可执行的工具、可写入的目标和可验证的结果拆开授权。MCP 协议本身也不替 Host 提供授权：客户端、服务器和管理员策略共同决定最终可用能力，详见 [MCP 协议](MCP协议.md)。

## 面试时如何诚实回答未使用工具

建议口径：

> 我实际长期使用的是 Codex 和 Claude Code；其他工具了解其定位，但没有真实项目数据，所以只比较工作形态和选型维度。

接着用“结论 → 证据 → 边界”回答，而不是借行业名词放大经历：

- **结论：** 我会先区分内联补全、IDE 对话、终端 Agent 和异步任务，再选择试点对象。
- **真实证据：** 对实际使用的 Codex、Claude Code，描述自己在仓库理解、修改、测试和 review 中做过的可验证闭环；数字、项目规模或具体效果没有证据时标注“【需本人确认】”。
- **边界：** 对 Cursor、GitHub Copilot、Windsurf、Cline、Roo Code、Aider，只能说明官方资料中的工作形态、配置入口和需要核查的权限/数据问题；不能说“我用过”“我接入过”或拿未做过的生产指标比较。

被追问“你会怎样评估某个没用过的工具”时，可以回答：先在隔离仓库做同一任务集，固定模型、权限和验收命令；检查上下文范围、MCP/规则、数据策略、diff/回滚和失败处理；有了团队自己的日志与结果后，才把结论升级为生产经验。

## 官方资料

以下链接是资料入口与核对范围；价格或计费资料只链接官方入口，不在本文抄录易变数字。

| 工具 | 能力、配置或安全资料 | 官方定价或计费资料 |
| --- | --- | --- |
| Codex | [Codex Manual](https://developers.openai.com/codex/codex-manual.md)；[Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security.md)；[MCP](https://learn.chatgpt.com/docs/extend/mcp.md) | [ChatGPT pricing](https://chatgpt.com/pricing) |
| Claude Code | [Getting started](https://docs.anthropic.com/en/docs/claude-code/getting-started)；[CLI reference](https://docs.anthropic.com/en/docs/claude-code/cli-usage)；[Data usage](https://docs.anthropic.com/en/docs/claude-code/data-usage) | [Anthropic pricing](https://www.anthropic.com/pricing) |
| Cursor | [Agent overview](https://docs.cursor.com/chat/overview)；[Modes](https://docs.cursor.com/en/agent/modes)；[Privacy & Security](https://docs.cursor.com/account/privacy)；[Background Agents](https://docs.cursor.com/background-agent) | [Cursor pricing](https://cursor.com/pricing) |
| GitHub Copilot | [MCP in the IDE](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/use-the-github-mcp-server)；[Cloud agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent)；[Content exclusion](https://docs.github.com/en/copilot/concepts/context/content-exclusion) | [Copilot plans](https://github.com/features/copilot/plans) |
| Windsurf | [Cascade overview](https://docs.windsurf.com/windsurf/cascade/cascade)；[Cascade MCP](https://docs.windsurf.com/windsurf/cascade/mcp) | [Windsurf pricing](https://windsurf.com/pricing) |
| Cline | [IDE usage](https://docs.cline.bot/usage/ide)；[Auto Approve & YOLO](https://docs.cline.bot/features/auto-approve)；[CLI overview](https://docs.cline.bot/usage/cli-overview) | [Cline pricing](https://cline.bot/pricing) |
| Roo Code | [Using modes](https://roocodeinc.github.io/Roo-Code/basic-usage/using-modes/)；[Using MCP](https://roocodeinc.github.io/Roo-Code/features/mcp/using-mcp-in-roo/)；[Custom modes](https://roocodeinc.github.io/Roo-Code/features/custom-modes/) | [Roo Code pricing](https://roocode.com/pricing) |
| Aider | [Documentation](https://aider.chat/docs/)；[Repository map](https://aider.chat/docs/repomap.html)；[Git integration](https://aider.chat/docs/git.html) | 无独立工具定价；按所选模型/提供方计费，见 [Connecting to LLMs](https://aider.chat/docs/llms.html) |

资料会随产品表面、计划与策略变化。面试或采购前，重新打开对应官方资料，并以团队已购买计划、管理员配置和实际试点结果为准。
