# React Native 启动、Bundle 与热更新

> **题目**：React Native 应用使用一个主 Bundle，首次启动较慢。你会不会直接拆包？热更新怎样保证兼容和回滚？

回答时先拆开三个概念：**Bundle 是 JavaScript 交付产物，启动性能是多阶段耗时，OTA 更新是受原生运行时兼容约束的发布机制。** 它们相关，但不是同一个问题。

## 1. 先定义测量口径

至少区分：

- 冷启动：进程不存在，从点击图标到首屏可用；
- 温启动：进程仍在后台，需要恢复页面和会话；
- 开发构建与 release 构建；
- 高端与低端设备、Android 与 iOS、首次安装与已缓存资源；
- 首帧出现、关键内容出现和可交互不是同一个时点。

启动时间可以继续分成：

```text
原生进程与页面创建
  → React Native runtime 初始化
  → Bundle 加载与执行入口
  → 应用 bootstrap / 会话恢复
  → 首屏数据和资源
  → 关键交互可用
```

新版 React Native 的 `performance.rnStartupTiming` 可以观察 runtime 初始化边界；业务还应通过 mark/measure 或监控 SDK 记录首屏、会话恢复和可交互时间。性能结论必须来自 release 构建和真实设备。

## 2. 单 Bundle 不等于所有代码都必须在首屏执行

一个 Bundle 只是交付形态。真正影响启动的是：

- 产物大小、加载和解析/执行成本；
- 入口 import 链上有多少同步初始化和副作用；
- 首屏前是否读取大存储、迁移数据、初始化多个 SDK；
- 字体、图片、语言包和配置是否阻塞首屏；
- 登录恢复、远程配置和更新检查是否被串行放在启动关键路径。

因此不应先说“拆包就能解决”。先用启动阶段和 profile 找出最长路径，再决定是否需要按路由延迟加载、调整 import 边界、启用当前工具链支持的延迟加载能力，或把非关键初始化移出首屏。

历史上的 RAM Bundle、inline requires 与今天的 React Native/Metro/Hermes 配置并非固定默认答案；面试时要说明项目版本并用真实产物验证。

## 3. 首次启动慢的常见治理顺序

1. **启动壳先可见**：尽快显示稳定的原生启动页或首屏骨架，避免长时间黑白屏。
2. **减少串行依赖**：会话恢复、必要配置并行；非关键 SDK、埋点补充信息和低优先级数据延后。
3. **收缩入口依赖**：避免入口导入全部页面、超大图标库、完整语言包或带重副作用的模块。
4. **控制同步工作**：大 JSON 解析、缓存迁移、加密和复杂状态归并不要长期占用 JS 线程。
5. **资源按首屏优先级处理**：字体和图片要有尺寸、缓存和失败兜底，不能因非关键资源阻塞可交互。
6. **在 release 真机复测**：开发模式、调试工具和大量 `console.log` 会显著干扰 JS 线程性能。

只优化“看见页面”的时间也不够。启动页提前隐藏但主线程仍被占满，用户会看到一个无法点击的假首屏。

## 4. 热更新的真实边界

以 Expo/EAS Update 为例，应用可以更新 JavaScript、样式和随更新发布的资源，但不能把依赖新原生模块的代码下发给旧二进制。`runtimeVersion` 用于约束更新与原生运行时兼容性。

发布链路至少包含：

```text
同 runtime 的预览构建验证
  → 生成并记录 update / commit / channel
  → 小比例 rollout
  → 观察启动、崩溃和核心流程
  → 扩量或取消 rollout / 回滚
```

需要新增或升级原生依赖、修改原生配置或改变原生 API 契约时，应生成新的商店构建和 runtime version，不能包装成普通热更新。

## 5. 更新检查不要反过来拖慢启动

根据业务风险选择策略：

- 紧急安全或强兼容更新可以阻断进入，但必须有超时、离线和失败兜底。
- 普通修复可先使用内置 Bundle 启动，在后台下载，下次启动或受控 reload 生效。
- 更新包需要校验来源与完整性，环境/channel 不能混用。
- 监控要能区分内置 Bundle、OTA update、runtime version 和 commit，否则崩溃无法归因。

“每次启动都等待远程更新完成”会把网络稳定性变成首屏可用性的单点依赖。

## 6. 60 秒口语答案

> 我不会因为是单 Bundle 就直接拆包。先在 release 真机上区分冷启动、温启动和可交互时间，再把冷启动拆成原生初始化、React Native runtime、Bundle 入口执行、会话恢复和首屏数据几个阶段。单 Bundle 不等于所有业务都必须在首屏执行，常见问题其实是入口 import 过大、同步初始化太多、多个 SDK 和远程配置串行阻塞。
>
> 优化时先收缩启动关键路径，让首屏壳和必要会话尽快可用，再延后非关键页面、SDK 和资源；每次用相同设备和 release 构建复测。
>
> 热更新方面我会区分 JavaScript 层和原生运行时。像 Expo Updates 需要用 runtimeVersion 保证兼容，涉及新原生模块就必须重新发包。生产更新要经过预览、灰度、崩溃与启动指标观察，并保留取消 rollout 或回滚能力，不能让一次 OTA 把所有已安装版本同时打坏。

## 7. 高频追问

### 为什么不把所有页面都做成动态加载？

拆分会增加边界、请求/读取、缓存和失败处理成本。应优先延迟低频且不在首屏依赖链上的模块，并通过产物和启动数据证明收益。

### 启动页显示得快就代表优化完成吗？

不代表。还要看首屏内容、JS/UI 帧率、关键交互可用和用户首次操作延迟；静态启动页只能遮住等待，不能消除等待。

### 热更新失败怎么办？

内置 Bundle 是基础兜底；生产更新应按 runtime 和 channel 精确投放，先小流量验证。发现高崩溃或启动失败时停止 rollout 或回滚到已验证更新，同时保留 update ID、commit 和设备版本用于定位。

## 关联内容

- [工程汇移动双端：Expo App 与原生微信小程序](../98-项目深挖/工程汇移动双端-App与小程序.md)
- [加载优化](../08-性能优化/加载优化.md)
- [构建优化](../08-性能优化/构建优化.md)
- [发版安全](发版安全.md)

## 参考

- [React Native Performance Overview](https://reactnative.dev/docs/performance.html)
- [React Native `performance.rnStartupTiming`](https://reactnative.dev/docs/global-performance#rnstartuptiming)
- [Expo Runtime versions and updates](https://docs.expo.dev/eas-update/runtime-versions/)
- [Expo Deploy updates](https://docs.expo.dev/eas-update/deployment/)
