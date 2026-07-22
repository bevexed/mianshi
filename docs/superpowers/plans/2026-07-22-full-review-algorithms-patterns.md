# 面试题库全量审核与算法、设计模式补全 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐常见算法与前端设计模式，并纠正全库已知的结构、技术、示例代码和面试表达问题。

**Architecture:** 先建立全库结构基线，再对算法和设计模式做重点重写，随后按模块批次逐篇审核，最后统一导航并执行链接、Markdown 和代码验证。个人事实与技术事实分开处理：技术错误直接修正，缺少证据的个人经历继续保留 `【需确认】`。

**Tech Stack:** Markdown、JavaScript、Node.js、本地 Git、`rg`、项目本地 Prettier

## Global Constraints

- 不覆盖或回退与本任务无关的用户改动。
- 不删除或弱化已有测试和有价值的注释。
- 不新增依赖、示例文件或校验脚本；一次性检查使用终端命令。
- Node.js 命令优先使用项目本地工具；格式检查使用 `pnpm exec prettier`。
- 无证据的个人经历、项目规模和效果数据不得改写为确定事实。
- 技术结论区分规范保证、特定实现细节和经验判断。

---

### Task 1: 建立全库结构与风险基线

**Files:**

- Inspect: `README.md`
- Inspect: `00-导航/目录.md`
- Inspect: `00-导航/复习路线.md`
- Inspect: `01-JavaScript/目录.md` 至 `16-后端常识/目录.md`
- Inspect: `99-归档/目录.md`

**Interfaces:**

- Consumes: 当前工作区文件树和 Git 状态
- Produces: 断链、重复主题、目录遗漏、过时标记和个人事实标记的可执行问题清单

- [ ] **Step 1: 记录现有改动边界**

  Run: `git status --short && git diff --stat && git diff --cached --stat`

  Expected: 输出当前改动文件，后续修改不回退这些内容。

- [ ] **Step 2: 检查本地 Markdown 和图片链接**

  Run: 使用 `node -e` 遍历全部 Markdown，解析非 HTTP、非锚点链接并按来源文件解析相对路径。

  Expected: 输出每个不存在的目标路径；修正后为 `broken_links=0`。

- [ ] **Step 3: 检查代码围栏与空文件**

  Run: 使用 `node -e` 统计每个 Markdown 的三反引号数量，并用 `find . -name '*.md' -size 0` 检查空文件。

  Expected: 所有代码围栏成对，业务模块无未说明的空 Markdown。

- [ ] **Step 4: 核对目录覆盖率**

  Run: `rg -n '\.md\)' README.md 00-导航 '*/目录.md'`

  Expected: 重命名后的算法文件、设计模式文件、15 数据库和 16 后端常识均能从导航进入。

---

### Task 2: 补全并验证通用算法题型

**Files:**

- Modify: `01-JavaScript/手写题/算法-高频题型.md`
- Modify: `01-JavaScript/目录.md`

**Interfaces:**

- Consumes: `算法-前端专属.md` 中的业务题索引
- Produces: 按识别信号、模板、复杂度和错误点组织的通用算法复习入口

- [ ] **Step 1: 审核现有示例和断言**

  Check: 双指针、滑动窗口、哈希、栈、链表、树、排序、动态规划和二分查找的边界与复杂度。

  Expected: 移除无版本限定的引擎实现断言；修正空输入、队列复杂度和伪代码标识问题。

- [ ] **Step 2: 补齐缺失高频类型**

  Add: 队列/堆、回溯、贪心、图遍历章节；每章包含最小可运行示例、复杂度和代表题。

  Expected: 覆盖哈希、指针、窗口、栈队列、堆、链表、树图、排序、二分、回溯、贪心、动态规划。

- [ ] **Step 3: 运行算法示例测试**

  Run: 用 `node` 对关键函数执行固定断言，包括空数组、重复值、无解、单节点和顺序保持。

  Expected: 进程退出码为 0，输出 `algorithm_examples=pass`。

- [ ] **Step 4: 更新 JavaScript 目录**

  Change: 将旧的 `手写题/算法题.md` 链接改为两篇新算法文章，并更新状态与考点描述。

  Expected: 两篇算法文章均可从 `01-JavaScript/目录.md` 进入。

---

### Task 3: 补全前端专属算法与手写题

**Files:**

- Modify: `01-JavaScript/手写题/算法-前端专属.md`
- Inspect: `01-JavaScript/手写题/防抖与节流.md`
- Inspect: `01-JavaScript/手写题/深拷贝与浅拷贝.md`
- Inspect: `01-JavaScript/手写题/手写Promise.md`
- Inspect: `01-JavaScript/手写题/手写Promise-all.md`
- Inspect: `01-JavaScript/手写题/call、apply、bind.md`
- Inspect: `01-JavaScript/手写题/new操作符.md`

**Interfaces:**

- Consumes: 现有独立手写题文章
- Produces: 无重复维护的前端业务算法索引和可运行示例

- [ ] **Step 1: 修正已有边界问题**

  Check: LRU 容量、扁平化顺序和复杂度、列表转树孤儿策略、树转列表顺序、大数输入、查询参数的 `+` 和重复键、并发任务同步抛错与拒绝行为。

  Expected: 每个函数明确输入约束；常见边界在代码中正确处理。

- [ ] **Step 2: 补齐高频手写实现**

  Add: 对象扁平化、柯里化、compose/pipe；EventEmitter 保持链接到唯一设计模式正文。

  Expected: 新内容不复制已有防抖、深拷贝和 Promise 文章。

- [ ] **Step 3: 运行前端专属示例测试**

  Run: 用 `node` 覆盖 LRU、扁平化、树转换、大数、版本号、查询参数、并发池、curry 和 compose。

  Expected: 进程退出码为 0，输出 `frontend_algorithm_examples=pass`。

---

### Task 4: 重构并补全设计模式

**Files:**

- Modify: `10-架构与设计/常用设计模式.md`
- Modify: `10-架构与设计/观察者与发布订阅.md`
- Modify: `10-架构与设计/发布订阅模式.md`
- Modify: `10-架构与设计/目录.md`

**Interfaces:**

- Consumes: `mvvm实现.md`、Vue 响应式、NestJS 和微前端文章中的框架场景
- Produces: 唯一的设计模式总览和唯一的观察者/发布订阅完整正文

- [ ] **Step 1: 按模式类别重组正文**

  Change: 创建型放置单例、工厂；结构型放置适配器、代理、装饰器、组合、外观；行为型放置策略、责任链、状态、命令、迭代器。

  Expected: 每种模式均说明问题、示例、适用条件、代价和易混淆点。

- [ ] **Step 2: 补充依赖注入与控制反转**

  Add: 解释 DI 不是 GoF 模式，说明 IoC、DI、工厂之间的边界，并联系 NestJS 的构造器注入。

  Expected: 不把 DI 错列为 GoF 23 种之一。

- [ ] **Step 3: 纠正框架类比**

  Change: 对 React `memo`、Vue Proxy、虚拟列表、生命周期和中间件等例子标注严格实现或思想类比。

  Expected: 不再用“某 API 就等于某模式”的绝对表述。

- [ ] **Step 4: 收敛重复文章**

  Change: `观察者与发布订阅.md` 保留完整实现；`发布订阅模式.md` 改成兼容入口并链接到完整正文。

  Expected: 内容只有一份权威来源，旧路径仍可访问。

- [ ] **Step 5: 运行模式示例测试并更新目录**

  Run: 用 `node` 验证工厂、策略、状态、命令和迭代器示例；检查 `10-架构与设计/目录.md` 的链接和状态。

  Expected: 示例退出码为 0，目录包含设计模式总览和观察者/发布订阅正文。

---

### Task 5: 审核基础语言、样式、浏览器与网络模块

**Files:**

- Inspect all and modify files with confirmed defects: `01-JavaScript/**/*.md`
- Inspect all and modify files with confirmed defects: `02-TypeScript/**/*.md`
- Inspect all and modify files with confirmed defects: `03-CSS与HTML/**/*.md`
- Inspect all and modify files with confirmed defects: `04-浏览器与网络/**/*.md`

**Interfaces:**

- Consumes: Task 1 的结构问题清单
- Produces: 语言和浏览器基础模块的确定性技术修正

- [ ] **Step 1: 逐篇检查技术结论**

  Check: JavaScript 类型与异步、TypeScript 类型行为、CSS 格式化上下文和层叠、HTTP/缓存/安全/存储。

  Expected: 规范行为与浏览器实现细节分开陈述，旧错误说明不再残留错误答案。

- [ ] **Step 2: 检查示例代码和命令**

  Run: 对可独立执行的 JavaScript 示例使用 `node --check` 或断言；对 TypeScript 示例做人工类型核验。

  Expected: 没有明显语法错误、错误 API 名或自相矛盾注释。

- [ ] **Step 3: 修正模块目录状态**

  Change: 目录中的文件名、行数描述、缺口和状态以审核后的实际内容为准。

  Expected: `01` 至 `04` 的目录和正文一致。

---

### Task 6: 审核框架、工程化与性能模块

**Files:**

- Inspect all and modify files with confirmed defects: `05-React生态/**/*.md`
- Inspect all and modify files with confirmed defects: `06-Vue生态/**/*.md`
- Inspect all and modify files with confirmed defects: `07-工程化/**/*.md`
- Inspect all and modify files with confirmed defects: `08-性能优化/**/*.md`

**Interfaces:**

- Consumes: 官方 React、Next.js、Vue、Vite、Webpack 和 Web Vitals 行为边界
- Produces: 带版本前提的框架与性能结论

- [ ] **Step 1: 核对版本敏感结论**

  Check: React 19、Next.js 15/16 缓存、Vue 2/3、构建工具、Core Web Vitals 和浏览器性能 API。

  Expected: 当前行为有版本限定，历史行为明确标记，不把实现细节写成长期规范。

- [ ] **Step 2: 审核工程实践建议**

  Check: 包管理、Monorepo、Source Map、Tree Shaking、监控、缓存和性能优化建议。

  Expected: 安全与性能建议不存在会误导生产实践的绝对化表达。

- [ ] **Step 3: 更新模块目录**

  Expected: `05` 至 `08` 的目录状态、优先级和正文一致。

---

### Task 7: 审核服务端、架构、AI、场景、项目与职业模块

**Files:**

- Inspect all and modify files with confirmed defects: `09-Node与服务端/**/*.md`
- Inspect all and modify files with confirmed defects: `10-架构与设计/**/*.md`
- Inspect all and modify files with confirmed defects: `11-AI工程/**/*.md`
- Inspect all and modify files with confirmed defects: `12-场景题/**/*.md`
- Inspect all and modify files with confirmed defects: `98-项目深挖/**/*.md`
- Inspect all and modify files with confirmed defects: `14-职业与团队/**/*.md`
- Inspect all and modify files with confirmed defects: `15-数据库/**/*.md`
- Inspect all and modify files with confirmed defects: `16-后端常识/**/*.md`
- Inspect all and modify files with confirmed defects: `99-归档/**/*.md`

**Interfaces:**

- Consumes: 项目内已有 Git 核验结果和 `【需确认】` 约定
- Produces: 服务端及项目表达中有证据的纠正和清晰的待确认边界

- [ ] **Step 1: 核对服务端与数据库技术结论**

  Check: Node 事件循环、NestJS、队列、Redis、MySQL、Java、Spring 和接口设计。

  Expected: 并发、事务、锁、索引和容器生命周期等结论不绝对化。

- [ ] **Step 2: 核对 AI 与场景题的时效和安全性**

  Check: MCP、RAG、AI 辅助开发、上传、验证码、发布、白屏和接口故障处理。

  Expected: 安全边界、失败恢复和版本时效表达准确。

- [ ] **Step 3: 审核项目和职业表述**

  Change: 修正仓库证据能证明的矛盾；保留无法证明的 `【需确认】`，将推测性语句改成待选择或待核验表述。

  Expected: 不新增个人事实，不把建议答案伪装成真实经历。

- [ ] **Step 4: 更新模块目录与归档说明**

  Expected: `09` 至 `16` 和 `99` 的目录链接、状态与正文一致。

---

### Task 8: 全库一致性与最终验证

**Files:**

- Modify: `README.md`
- Modify: `00-导航/目录.md`
- Modify: `00-导航/复习路线.md`
- Inspect all and modify directories with confirmed inconsistencies: `01-JavaScript/目录.md` 至 `16-后端常识/目录.md`
- Inspect and modify if confirmed inconsistent: `99-归档/目录.md`

**Interfaces:**

- Consumes: Tasks 2–7 的最终文件状态
- Produces: 可导航、无已知断链、格式一致的完整题库

- [ ] **Step 1: 重新生成结构检查结果**

  Run: 重复 Task 1 的链接、围栏、空文件和目录检查。

  Expected: `broken_links=0`、`unclosed_fences=0`，目录无旧文件路径。

- [ ] **Step 2: 运行格式与差异检查**

  Run: `pnpm exec prettier --check '**/*.md'` 和 `git diff --check`。

  Expected: Prettier 输出检查结果；所有本轮修改至少通过 `git diff --check`，没有尾随空格或冲突标记。

- [ ] **Step 3: 复核个人事实边界**

  Run: `rg -n '【需确认】' 07-工程化 08-性能优化 12-场景题 98-项目深挖 14-职业与团队 16-后端常识`

  Expected: 每处标记仍明确指向需要用户提供的事实，没有被无依据补全。

- [ ] **Step 4: 审阅最终差异**

  Run: `git diff --stat && git diff --check && git status --short`

  Expected: 只有题库内容、导航和方案文件发生变化，无依赖或无关资产变更。
