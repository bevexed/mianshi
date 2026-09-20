# AI 对话流式渲染

> **题目**：在 React Native App 和原生微信小程序中，如何实现带鉴权的 AI 对话流式渲染？怎样处理中文被截断、回答跳变、滚动抢位置、停止生成和网络中断？
>
> 实践来源：工程汇 Expo App 与原生微信小程序当前实现，截至 2026-09-10。

---

## 1. 30 秒面试回答

> 我把 AI 流式对话拆成五层。传输层在 App 使用可读取 `ReadableStream` 的 fetch，在小程序使用 `wx.request(enableChunked)`；解析层用增量 UTF-8 解码和 SSE 帧缓存解决字符、行和事件跨 chunk；状态层把 `message`、`message_replace`、`message_end`、`error` 归约成会话消息；渲染层不直接跟着网络 chunk 抖动，而是用 20ms 打字器平滑追赶目标文本，并只在用户接近底部时自动滚动；恢复层要求业务结束事件才算成功，支持 client abort、server task stop、partial text 保留，以及按远程 messageId 回查已落库回答。

这段回答包含了完整主线：**传输 → 解码 → 协议 → 状态 → 渲染 → 恢复**。

---

## 2. 先澄清：这里的“流式渲染”是什么

它不是 React Server Components 或 Suspense 的 HTML 流式渲染，而是 AI 回答的增量展示。

还要区分三件经常被混在一起的事：

| 概念       | 含义                                 | 是否由前端完全控制               |
| ---------- | ------------------------------------ | -------------------------------- |
| 网络流式   | 服务端在一个 HTTP 响应中持续发送字节 | 否，受模型、网关、TCP 和平台影响 |
| 状态增量   | 把协议事件归并成当前回答文本与状态   | 是                               |
| 打字机动画 | 按固定节奏逐步暴露已经收到的文字     | 是                               |

如果服务端一次性返回整段文本，前端仍可以做打字机动画，但那不是真正的网络流式；如果服务端持续推送而 UI 每次整段跳变，那是真流式请求，却不一定有好的流式体验。

---

## 3. 完整数据流

```text
用户发送问题
  ↓
先插入 user message + pending assistant message
  ↓
POST /ai/agent/chat/stream
  ↓
平台 transport 持续收到 Uint8Array / ArrayBuffer
  ↓
增量 UTF-8 解码器
  ↓
SSE 帧缓存，以空行结算完整事件
  ↓
事件归约：追加 / 替换 / 完成 / 错误
  ↓
raw answer → 移除 think 内容 → target text
  ↓
20ms 打字器追赶 target text
  ↓
Markdown 受控渲染 + 条件式滚动跟随
  ↓
message_end 后完成；异常则恢复或进入可重试状态
```

这个拆分的价值是：任何一层出问题，都可以单独定位。中文乱码优先查解码，整段跳变查渲染节奏，回答串到另一个会话查状态归属，明明生成完却报错则查完成语义和恢复策略。

---

## 4. 为什么没有直接使用 EventSource

浏览器原生 `EventSource` 适合 GET 型服务端推送，但 AI 提问通常需要：

- POST JSON 请求体；
- `Authorization: Bearer ...`；
- 图片上传后的 fileId；
- 主动取消；
- React Native 和微信小程序运行时适配。

因此项目使用 SSE **消息格式**，但 transport 分别是：

- App：支持流式响应体的 fetch。
- 小程序：开启分块回调的 `wx.request`。

### 高频追问：这还算 SSE 吗？

算。SSE 可以指 `text/event-stream` 的响应格式；EventSource 是浏览器消费这种格式的一种 API。使用 fetch 自己解析同样的帧格式，仍然是在消费 SSE，只是重连、解析和取消要由应用负责。

---

## 5. 两个平台的 transport 差异

### 5.1 React Native / Expo App

核心形式：

```ts
const response = await authenticatedFetch(url, {
	method: 'POST',
	headers: {
		Accept: 'text/event-stream',
		'Content-Type': 'application/json'
	},
	body: JSON.stringify(payload),
	signal
});

if (!response.body) throw new Error('没有可读取的响应流');

const reader = response.body.getReader();
while (true) {
	const chunk = await reader.read();
	if (chunk.done) break;
	parser.push(chunk.value);
}
parser.finish();
```

关键点：

- 通过 `AbortController` 终止客户端读取。
- 在建立流之前注入 Access Token。
- 流请求遇到 401 时最多串行刷新一次会话，不能无限递归。
- `finally` 中取消 reader 并释放锁，避免页面离开后继续占用连接。

### 5.2 原生微信小程序

核心形式：

```ts
const task = wx.request({
	url,
	method: 'POST',
	data: payload,
	enableChunked: true,
	timeout: 300_000,
	header: {
		Accept: 'text/event-stream',
		'content-type': 'application/json',
		Authorization: `Bearer ${token}`
	}
});

task.onChunkReceived(({ data }) => {
	parser.push(new Uint8Array(data));
});
```

关键点：

- 必须保留 `RequestTask`，停止生成或页面卸载时调用 `abort()`。
- 普通 `success` 只表示请求结束，业务上仍要检查是否收到 `message_end`。
- 给生成设置明确的长超时，当前实现为 300 秒，并把 timeout、abort 和普通网络失败转换成不同提示。
- 生成类 POST 不应在 401 后盲目重放，否则可能重复生成和计费。

---

## 6. 为什么一个 chunk 不能直接 `toString`

网络分块边界是任意的，它不保证对齐：

- 一个 Unicode 字符；
- 一行 `data:`；
- 一个 JSON 对象；
- 一个 SSE 事件；
- 一个模型 token。

例如“建”在 UTF-8 中占三个字节，可能前两个字节在 chunk A，最后一个字节在 chunk B。对 chunk A 单独解码可能得到替换字符 `�`，后续无法恢复原文。

### App 的做法

```ts
const decoder = new TextDecoder();
let buffer = '';

const push = (chunk: Uint8Array) => {
	buffer += decoder.decode(chunk, { stream: true });
};

const finish = () => {
	buffer += decoder.decode();
};
```

`stream: true` 会把末尾未完成的 UTF-8 字节留在 decoder 内部，等下一块到来。

### 小程序的做法

当前实现不依赖 `TextDecoder`，而是维护 `pendingBytes`：每次尝试解码完整数组；如果末尾构不成完整 UTF-8，就最多保留三个字节到下一个 chunk。

为什么最多保留三个？一个 UTF-8 code point 最多四字节；当前 chunk 末尾最多可能已有三个仍不足以完成解码的前缀字节，需要等下一块继续拼接。

### 高频追问：为什么 UI 切字符还用 `Array.from`？

JavaScript 字符串按 UTF-16 code unit 索引，直接 `slice(0, n)` 可能拆开 emoji 的代理对。`Array.from(text)` 至少按 Unicode code point 切分，能避免多数 emoji 被切成半个字符。

要进一步完整支持家庭 emoji、旗帜和带肤色组合，应按 grapheme cluster 分割，例如使用 `Intl.Segmenter`，但要先核对目标运行时支持和包体成本。

---

## 7. SSE 事件也会跨 chunk

SSE 事件通常以空行结束：

```text
data: {"event":"message","answer":"第一段"}

data: {"event":"message_end"}

```

但实际到达可能是：

```text
chunk 1: data: {"event":"mes
chunk 2: sage","answer":"第一段"}\r
chunk 3: \r\ndata: {"event":"message_end"}\n\n
```

因此解析器要维护字符串 buffer，只在 `\n\n` 或 `\r\n\r\n` 出现时结算完整帧。

简化骨架：

```ts
const createSseParser = (onEvent: (event: SseEvent) => void) => {
	const decoder = new TextDecoder();
	let buffer = '';

	const drain = () => {
		let boundary = buffer.match(/\r?\n\r?\n/);
		while (boundary?.index !== undefined) {
			parseFrame(buffer.slice(0, boundary.index), onEvent);
			buffer = buffer.slice(boundary.index + boundary[0].length);
			boundary = buffer.match(/\r?\n\r?\n/);
		}
	};

	return {
		push(chunk: Uint8Array) {
			buffer += decoder.decode(chunk, { stream: true });
			drain();
		},
		finish() {
			buffer += decoder.decode();
			drain();
			if (buffer.trim()) parseFrame(buffer, onEvent);
			buffer = '';
		}
	};
};
```

### 一个帧里多行 data 怎么办？

按 SSE 语义收集所有 `data:` 行，再用换行拼接。不要假设一帧永远只有一行。

### 单帧 JSON 损坏怎么办？

当前项目选择忽略单个损坏帧，继续等待后续 `error` 或 `message_end`。这是“尽量保住后续回答”的策略，但要有监控记录损坏情况；如果业务要求严格一致，也可以让已知关键事件解析失败直接终止。

### `[DONE]` 和 `message_end` 是一回事吗？

不一定。不同上游协议可能使用 `[DONE]`，项目当前真正的业务完成标志是 JSON 事件 `message_end`。协议适配层应明确一个权威完成条件，不能看到连接关闭或任意结束标记就判成功。

---

## 8. 事件不是字符串拼接，而是状态机输入

当前项目处理的关键事件：

| event                       | 动作                                      |
| --------------------------- | ----------------------------------------- |
| `message` / `agent_message` | 把 `answer` 追加到累计原文                |
| `message_replace`           | 用新 `answer` 替换累计原文                |
| `message_end`               | 标记业务生成完成，读取知识来源等 metadata |
| `error`                     | 保存错误并终止本轮生成                    |

同时持续收集：

- `task_id`：停止服务端生成任务。
- `message_id`：加载推荐问题、断流回查和历史对齐。
- `conversation_id`：把本地临时会话接管为服务端会话。

### 为什么必须支持 message_replace？

上游可能在生成过程中纠正或重写整段回答。如果前端只会 append，最终内容就会同时保留旧文本和替换文本。协议适配器必须按事件语义处理，不能把所有 answer 都当增量 token。

### 推荐状态

```text
idle
  ├─ 有图片 → uploading
  └─ 纯文本 → streaming

uploading → streaming
streaming → completed
streaming → stopping → stopped
streaming → failed
failed → retry → streaming
```

`busy` 不只是按钮样式，它还是并发门禁：同一会话上一轮未结束时，不能再次发送、切换历史或让旧异步结果写入新上下文。

---

## 9. 为什么要先插入一条 pending assistant message

用户点击发送后，先同步写入：

1. 用户消息，状态 `sent`。
2. 助手占位消息，状态 `pending`。

这样有几个好处：

- UI 立即响应，不等待首个网络 chunk。
- 思考卡、流式正文、失败态和重试按钮都围绕同一个稳定 messageId 更新。
- 不会每个 chunk 都往数组追加一条新消息。
- 流结束时只需把同一条消息 settle 为 `sent`。

状态更新最好写成纯函数，例如 `appendMessage`、`updateProgress`、`settleMessage`、`failMessage`，避免网络回调里直接拼一大段可变状态。

---

## 10. 本地会话 ID 为什么必须“接管”

新对话发送前，客户端还没有服务端 conversationId，所以先创建：

```text
local-1720000000000
```

首个流式事件可能返回：

```text
conversation_id = remote-8f3a...
```

此时不能简单再新增一个会话，而要原子替换：

- 会话列表里的 id；
- `activeConversationId`；
- 当前 stream 所属 conversationId；
- 小程序打字器里的 conversationId；
- 后续提问携带的 conversationId。

否则会出现：

- 当前回答写进本地会话，刷新后却加载服务端另一个会话；
- 历史列表多出一条重复记录；
- 下一轮问题被当成新对话；
- 打字器仍在更新已经不存在的旧 id。

这是一种典型的 **临时实体 ID 与服务端实体 ID 对账** 问题，在离线创建、上传任务和乐观更新里也常见。

---

## 11. 真正关键：不要用网络 chunk 驱动显示节奏

网络 chunk 可能：

- 很长时间没有内容；
- 突然一次到几百字；
- 一秒内高频到达很多小块；
- 受网关缓冲影响合并发送。

如果每次 chunk 都原样显示，用户看到的可能是停顿后整段跳出；如果每个字符都立即 setState，又可能造成大量渲染和布局。

项目采用 **目标文本 + 显示文本**：

```text
网络层累计结果 → targetText
20ms 定时器      → displayText 逐步追赶 targetText
```

当前步长规则：

```ts
const remaining = targetCharacters.length - currentCharacters.length;
const step = Math.min(4, Math.max(1, Math.ceil(remaining / 80)));
```

- 短回答逐字显示。
- backlog 较多时每 tick 最多追赶 4 个字符。
- 既保留打字感，又避免服务端瞬间返回长回答后让用户等很久。

### 小程序为什么把 timer 放 WeakMap，而不是 page data？

timer、RequestTask 这类运行时对象不属于可序列化视图状态，也不应该触发 WXML 更新。用以页面实例为 key 的 WeakMap 保存，可以隔离多个页面实例，并在卸载时集中清理。

### App 还考虑了什么可访问性？

用户开启“减少动态效果”时，跳过打字和旋转动画，直接展示完整文本。动画是体验增强，不应成为阅读内容的前置条件。

### 高频追问：setInterval 一定是最佳方案吗？

不一定。20ms 低于常见 60Hz 屏幕的一帧时间，实际调度仍会被合并；还可以用 `requestAnimationFrame`，按帧和经过时间计算进度。选择时要测长回答下的 JS 线程占用、Markdown 重排和滚动表现，而不是只争论 API 名字。

---

## 12. Markdown 为什么要边流边“安全渲染”

流式 Markdown 可能在任意位置暂停：

```text
**重要内
```

这时加粗标记还没闭合。实现要允许“不完整语法暂时按普通文本展示”，下一批文本到达后再重新解析，不能因为半个标记让整条消息崩溃。

项目只支持受控子集：

- 一到三级标题；
- 有序/无序列表；
- 引用；
- `**加粗**`；
- 普通段落。

### App

把每一行转成 React Native 的 `Text` / `View` 节点，不执行 HTML。

### 小程序

先转义 `& < > " '`，再生成受控的 rich-text 节点。不能直接把模型输出作为 HTML/WXML 注入。

### 为什么要过滤 think 标签？

上游有时会把内部推理包在 `<think>...</think>` 中。前端对累计原文反复清洗，并额外处理“开放中的 think 块”和被 chunk 截断的部分标签，只展示最终答案。

安全边界要说清：前端过滤是展示兜底，不应把模型内部推理下发给客户端作为长期方案；更理想的是上游协议从源头只返回允许展示的内容。

---

## 13. 自动滚动为什么不是每次都 scrollToEnd

错误做法：

```ts
useEffect(() => scrollToEnd(), [message.text]);
```

用户正在向上阅读历史时，新 chunk 一来就被拉回底部，长回答几乎无法阅读。

正确模型是维护 follow 状态：

```text
接近底部 → following = true  → 内容增长时自动贴底
用户上滑 → following = false → 不抢位置，显示“回到最新”
点击按钮 → following = true  → 主动回到底部
```

### App 的额外处理

- `FlatList.maintainVisibleContentPosition` 保持前插历史后的可见锚点。
- 首次加载长回答时，布局可能分多次完成，要在内容高度稳定前继续定位底部。
- 键盘完全展开后，如果仍处于 follow 模式，再校准一次底部。

### 小程序的额外处理

- 使用稳定的 `scroll-into-view` 尾部锚点。
- 清空再写入锚点，确保重复点击“回到最新”仍能触发。
- 根据滚动位置更新 `following` 和按钮可见性。

面试里可以总结为：**自动化只能在用户没有表达相反意图时接管滚动。**

---

## 14. 停止生成要做两件事

仅调用 `abort()`：客户端不再读，但服务端模型可能还在生成。

仅调用停止接口：服务端会停，但本地旧流和回调可能继续写 UI。

因此要双向停止：

1. 有 `taskId` 时调用 `/tasks/{taskId}/stop`。
2. 本地标记 `stopped`，忽略后续 progress。
3. abort `ReadableStream` 或小程序 `RequestTask`。
4. 清理打字器。
5. 把 partial text 保留下来，并明确显示“回答已停止”。

停止接口失败时，客户端仍应停止展示和断开连接；但服务端是否继续消耗资源，需要监控和后续补偿。

---

## 15. 为什么连接正常结束仍不能直接判成功

TCP/HTTP 流结束只说明连接关闭，不代表业务完成。可能发生：

- 网关超时关闭；
- 移动网络切换；
- 服务进程重启；
- 上游只发了一半内容；
- 最后的 `message_end` 丢失。

所以完成条件是：

```text
收到 message_end
  AND 最终展示文本非空
```

否则进入 `INCOMPLETE_STREAM` 或 `EMPTY_ANSWER`。

这个判断比“reader.read() 返回 done”更接近业务事实。

---

## 16. 断流恢复不是简单自动重发

生成请求有副作用，也可能产生模型成本。网络断开后立刻自动 POST 同一个问题，可能得到两份回答或两个会话。

当前项目采用分层恢复：

### 第一层：保留 partial text

已经展示的内容不清空，消息标记为 failed，并提供重新生成入口。

### 第二层：按远程消息 ID 对账

App 在已经拿到 `messageId` 时回查当前会话历史：

1. 如果服务端存在同一远程 ID 的完整回答，说明只是客户端丢了尾包。
2. 用服务端回答 settle 当前本地消息。
3. 如果查不到或回答仍为空，再保留 partial text 并标记失败。

### 第三层：刷新后的历史恢复

历史记录里如果只有用户问题、回答为空，恢复一条可重试的 assistant failed 消息，而不是让用户误以为从未提问。

### 这和 SSE 断线续传有什么区别？

这里做的是 **最终状态对账**，不是从某个 token 继续消费。真正的断点续传需要服务端提供事件 ID、可重放日志或生成任务游标，并定义过期和幂等规则。可继续参考：[SSE 断线重传](../12-场景题/SSE断线重传.md)。

---

## 17. 异步结果怎样避免写错会话

典型事故：

1. 会话 A 正在流式生成。
2. 用户切换租户、切换会话或离开页面。
3. 会话 A 的旧回调继续到达。
4. 结果被写进会话 B。

保护手段：

- 每轮生成创建独立 controller/task 对象。
- progress 写回前验证它仍是 `activeReply`。
- 切换上下文时 abort 旧 controller。
- 页面加载使用 generation，旧轮次返回后直接丢弃。
- 写消息时同时校验 conversationId 和 messageId。
- 页面卸载时清理 stream、timer 和订阅。

这是一条可迁移原则：**所有异步回调都应证明“我仍属于当前上下文”，而不是默认发起时属于，返回时也属于。**

---

## 18. 性能优化从哪里下手

### 18.1 避免每个字符新增节点

一轮回答始终更新同一条 assistant message，不把每个 token 存成一条消息。

### 18.2 列表虚拟化

App 使用 FlatList，历史消息分页加载；小程序也按游标分页，不一次拉取全部会话和消息。

### 18.3 控制渲染频率

小程序的网络回调只更新 `targetText`，显示文本按定时器推进。进一步优化可以把多个网络 progress 合并到一帧，减少 Markdown 解析和布局次数。

### 18.4 Markdown 增量的取舍

当前回答每次变化会重新解析可见文本，逻辑简单可靠。超长代码块、表格或复杂公式场景下，应考虑分段缓存 AST、限制最大渲染长度或虚拟化消息内部内容，但没有真实性能证据前不提前复杂化。

### 18.5 先测哪些指标

- 首字节/首字符时间。
- 网络完成时间与 UI 追赶完成时间。
- 每秒状态更新和 commit 次数。
- 长回答下 JS 线程卡顿和掉帧。
- Markdown 解析耗时。
- 自动滚动造成的布局次数。
- 页面离开后的连接、timer 和内存是否释放。

本文没有可核验的生产性能数字，面试时不要自行编造。

---

## 19. 测试矩阵

### 19.1 UTF-8 与 SSE 解析

- 一个中文字符被拆成 2 ～ 3 个 chunk。
- emoji 被分块。
- 一条 SSE 跨多个 chunk。
- 一个 chunk 包含多条 SSE。
- `\n\n` 与 `\r\n\r\n`。
- 多行 `data:`。
- `[DONE]`、空帧和注释行。
- 单帧 JSON 损坏后，后续合法帧仍可解析。
- 最后一帧没有空行，由 `finish()` 冲刷。

### 19.2 事件和完成语义

- `message` 连续追加。
- `message_replace` 覆盖旧累计内容。
- `message_end` 后才成功。
- 连接关闭但没有 `message_end`。
- `message_end` 到达但回答为空。
- `error` 带上游文案和不带文案。
- metadata 中知识来源为空或存在。

### 19.3 会话状态

- 本地 conversationId 接管服务端 id。
- 接管发生时 active id、列表和打字器同步更新。
- 切换会话后旧 progress 不写回。
- 会话删除、页面卸载、租户切换时 abort。
- 历史分页去重和锚点保持。

### 19.4 渲染体验

- 短回答逐字、长 backlog 加速追赶。
- 目标文本发生 replace 时立即对齐，不从错误前缀继续。
- emoji 不被切成代理对乱码。
- 未闭合 Markdown 不崩溃。
- 原始 HTML 被转义。
- `<think>` 完整、未闭合和标签自身跨 chunk。
- 用户上滑后不自动贴底，点击按钮恢复 follow。
- 减少动态效果开启后直接展示正文。

### 19.5 异常与恢复

- 401、timeout、普通网络失败、用户 abort。
- stop 接口成功与失败。
- partial text 保留。
- 远程 messageId 回查到完整回答。
- 回查失败后仍保持可重试状态。

---

## 20. 常见错误回答

### 错误一：“后端返回一个字，我就 setState 一个字”

问题：chunk 不等于字符或 token，网络节奏也不等于合适的显示节奏。

### 错误二：“reader done 就说明生成完成”

问题：连接结束不等于业务完成，必须看明确结束事件和有效正文。

### 错误三：“断线就自动重新发送”

问题：可能重复生成、重复会话和重复计费，应优先对账或要求服务端支持幂等/续传。

### 错误四：“每次来内容都滚到底部”

问题：会抢走用户阅读历史的控制权。

### 错误五：“模型返回 Markdown，直接 innerHTML”

问题：模型内容和检索内容都是不可信输入，必须受控解析和转义。

### 错误六：“调用 abort 就完成了停止生成”

问题：它只停止客户端读取，服务端任务可能仍在运行。

### 错误七：“SSE 天生会断线续传”

问题：只有协议、服务端事件日志和客户端游标共同设计后才可恢复；fetch 自解析也不会自动得到 EventSource 的重连行为。

---

## 21. 高频追问

### Q1：SSE 和 WebSocket 如何选择？

AI 文本主要是服务端单向推送，SSE 基于 HTTP、语义简单；高频双向交互、实时语音或协作编辑更适合 WebSocket。选择还要看网关、鉴权、移动端 SDK 和断线恢复能力。

### Q2：为什么不用轮询？

轮询实现简单，但首字符延迟更大，会产生大量空请求，也不适合逐步展示长回答。可以把轮询作为不支持流式平台的降级，但不能假装成同等体验。

### Q3：怎么处理背压？

ReadableStream 有读取节奏，但 UI 仍可能慢于网络。不要为每个 chunk 做昂贵渲染；只保存最新 targetText，按帧或固定 tick 合并 UI 更新。必要时限制回答长度和 Markdown 复杂度。

### Q4：能做到 exactly-once 吗？

单靠客户端做不到。生成请求需要幂等键或服务端 taskId；事件需要稳定 id 和可重放日志；客户端还要按 messageId 去重。通常更现实的目标是 at-least-once 传输加幂等归约，或者通过最终状态对账达到一致展示。

### Q5：如何防止 Token 泄露？

Token 放 Authorization 请求头和安全存储，不放 URL、模型 prompt、普通缓存或错误日志；BFF 隐藏上游 API Key 和内部地址。SSE 错误响应也要转换成稳定文案，不能把上游详情原样展示。

### Q6：推荐问题为什么在回答结束后单独加载？

它不是完成当前回答的必要条件。独立异步加载可以缩短主链路，下一次提问或会话切换时取消旧请求，失败也不影响正文。

### Q7：如果消息非常多，FlatList 就够了吗？

还需要历史分页、稳定 key、前插锚点和消息组件 memo。单条回答特别长时，列表虚拟化也救不了消息内部的大量节点，要再评估 Markdown 分段和内容上限。

### Q8：如何支持真正的断点续传？

服务端需要给每个事件稳定游标并保留一段时间的事件日志，客户端记录最后已提交游标，重连时携带；服务端从下一条重放，客户端按事件或 messageId 去重。如果游标过期，则返回快照再重新订阅。

---

## 22. 2 分钟完整回答模板

> 这个需求最容易被低估的地方，是把“收到一段文本”直接等同于“渲染一段文本”。我实际会拆成 transport、parser、state、render 和 recovery 五层。
>
> transport 层因为要 POST 问题、带 Bearer Token 和支持主动停止，App 用流式 fetch，小程序用 `wx.request` 的 chunked 模式，而不是浏览器 EventSource。parser 层先解决任意网络分块：App 用 TextDecoder stream，小程序缓存未完成 UTF-8 尾字节；然后再按空行切 SSE 帧，不能按单个 chunk JSON.parse。
>
> state 层把 message 做追加、message_replace 做覆盖、message_end 作为业务完成、error 进入失败态，同时记录 taskId、messageId 和 conversationId。首次对话先用本地临时 id，服务端 id 到达后原子接管，防止刷新后历史分叉。
>
> render 层不直接跟网络节奏走，而是维护 targetText 和 displayText，用 20ms tick、每次 1 到 4 个 Unicode code point 平滑追赶；Markdown 只渲染受控子集并过滤不可展示的 think 内容。滚动只在用户接近底部时跟随，用户上滑后显示“回到最新”。
>
> recovery 层要求收到 message_end 且正文非空才算成功。用户停止时同时 abort 客户端连接并按 taskId 停服务端任务；异常时保留 partial text。如果已拿到远程 messageId，App 会回查历史，服务端已落库就恢复完整答案，否则进入可重试状态。这样处理的是完整业务一致性，不只是一个打字动画。

---

## 23. 手写题：实现时应该先写哪些用例

面试官让你现场写解析器时，不要直接堆完整代码，先说出四个最关键用例：

1. 中文字符跨 chunk。
2. 一条 SSE 跨 chunk。
3. 一个 chunk 有多条 SSE。
4. 连接结束时冲刷没有空行的尾帧。

再补事件 reducer：

```ts
type StreamState = {
	completed: boolean;
	rawText: string;
	taskId?: string;
	messageId?: string;
};

const reduceEvent = (state: StreamState, event: SseEvent): StreamState => {
	if (event.event === 'message') {
		return { ...state, rawText: state.rawText + String(event.answer ?? '') };
	}
	if (event.event === 'message_replace') {
		return { ...state, rawText: String(event.answer ?? state.rawText) };
	}
	if (event.event === 'message_end') {
		return { ...state, completed: true };
	}
	return state;
};
```

最后主动说出省略项：鉴权刷新、错误分类、取消、来源 metadata、ID 接管、滚动和测试。能明确边界，比在白板上假装写完生产实现更可信。

---

## 24. 复习检查

- [ ] 能区分网络流式、状态增量和打字机动画。
- [ ] 能解释 chunk 为什么不等于字符、token、JSON 或 SSE 事件。
- [ ] 能写出 TextDecoder stream + SSE buffer 骨架。
- [ ] 能说明小程序 `enableChunked` 与 App ReadableStream 的差异。
- [ ] 能解释 append、replace、end、error 四种事件语义。
- [ ] 能画出 idle、uploading、streaming、stopping、failed 状态。
- [ ] 能说明临时 conversationId 接管的全部更新点。
- [ ] 能解释为什么用户上滑后不能自动贴底。
- [ ] 能说明停止生成为什么需要 client abort + server stop。
- [ ] 能解释 `message_end` 为什么比 TCP EOF 更可信。
- [ ] 能区分最终状态对账与真正事件断点续传。
- [ ] 能列出 UTF-8、SSE、渲染、滚动、取消和恢复测试。
