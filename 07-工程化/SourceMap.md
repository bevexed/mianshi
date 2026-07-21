# Source Map

## 有哪些类型，生产环境该用哪个

| devtool | 特点 | 场景 |
|---|---|---|
| `eval-cheap-module-source-map` | 构建快，行级映射 | **开发环境** |
| `source-map` | 完整独立文件，质量最高，构建慢 | 生产（需完整还原） |
| `hidden-source-map` | 生成文件但**产物里不加注释链接** | **生产 + 错误监控（推荐）** |
| `nosources-source-map` | 有映射但**不含源码内容** | 只想看堆栈不想暴露源码 |
| `false` | 不生成 | 完全不需要排查 |

---

## 生产环境的正确做法

1. 用 `hidden-source-map` 生成 map 文件
2. **上传到 Sentry 后从服务器删除**，不部署到 CDN
3. 这样错误能还原源码，但**用户拿不到 map 文件**

### 为什么不能直接部署 map

等于把源码公开——业务逻辑、接口结构、
甚至注释里的敏感信息全暴露。

> 关联：[13-项目深挖/Sentry私有化部署.md](../13-项目深挖/Sentry私有化部署.md)

---

## 原理

- 是一个 JSON 文件，核心是 **`mappings` 字段**——
  用 **VLQ（可变长度量化）编码**存储
  「压缩后位置 → 源码位置」的映射
- 之所以用 VLQ 而不是明文，是因为映射数据量极大，需要极致压缩
- 浏览器 / Sentry 读到 `//# sourceMappingURL=` 注释后
  加载 map 文件做还原

```json
{
  "version": 3,
  "sources": ["src/app.ts"],
  "names": ["foo", "bar"],
  "mappings": "AAAA,SAASA,GAAG..."   ← VLQ 编码
}
```

---

## 上传后还原不出来的常见原因

**（这题是真踩过才答得出的）**

1. **release 不一致**——上传时用 commit hash，
   运行时 SDK init 用 package version，对不上
2. **`dist` 参数缺失**——同一 release 下有多套产物
   （比如多环境）时需要 dist 区分
3. **文件路径不匹配**——上传时的路径前缀和运行时
   `//# sourceMappingURL` 里的路径对不上，需要配 `urlPrefix`
4. **sourcemap 没上传成功但构建流程没报错**——
   CI 里要检查上传结果，不能静默失败

---

## 怎么验证配对成功

- Sentry 项目设置里可以直接查 release 下的 artifacts
- `sentry-cli sourcemaps explain <event-id>` 能诊断具体哪一环没对上
- **上线前先人为抛一个错验证一遍**，
  别等真出事故了才发现还原不出来
