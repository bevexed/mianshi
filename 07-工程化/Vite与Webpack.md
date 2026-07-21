# Vite 与 Webpack

> Webpack 的构建流程与 loader/plugin 细节见
> [webpack和gulp原理.md](webpack和gulp原理.md)

## Vite 为什么快

**要分开讲「开发时快」和「构建时快」，这是最容易答混的地方。**

### 开发环境（差距最大的地方）

- **不打包**。Webpack dev server 要先把整个依赖图打包成 bundle 才能启动，
  项目越大启动越慢；
  Vite 直接启动一个服务器，**利用浏览器原生 ESM**，
  请求哪个模块才编译哪个模块 →
  **启动时间和项目规模基本无关**
- **依赖预构建**：用 **esbuild**（Go 写的，比 JS 工具快一个数量级）
  把 `node_modules` 里的 CommonJS 转成 ESM 并合并，
  避免几百个模块产生几百个 HTTP 请求
- **HMR 精准**：只需失效改动的模块本身，不用重建 bundle；
  Webpack 的 HMR 要沿着依赖图重新构建受影响的 chunk

### 生产环境

Vite 用 **Rollup** 打包（Vite 5+ 可选 Rolldown）。

> **生产构建 Vite 并不必然比 Webpack 快**——
> 能说出这一点说明你真的理解，而不是背营销文案。

---

## 那为什么生产环境不也用 esbuild

- esbuild **不支持完整的代码分割和一些高级优化**，产物质量不如 Rollup
- 生产构建是低频操作（CI 里跑），**产物质量比构建速度重要**
- 开发环境相反——高频、只要能跑，所以用 esbuild 追求速度

**这个"按场景选不同工具"的取舍是很好的答题材料。**

---

## Webpack 的构建流程（仍要会）

```
1. 初始化：合并配置，创建 Compiler
2. 编译：从 entry 出发，调用 loader 转换每个模块
3. 构建依赖图：递归解析 import/require
4. 分块：按 splitChunks 规则生成 chunk
5. 生成：把 chunk 转成 assets
6. 输出：写入 output 目录
```

### Loader 和 Plugin 的区别

- **Loader 是转换器**，作用于单个文件
  （把 less 转 css、把 ts 转 js），
  链式调用，**从右到左**执行
- **Plugin 是扩展器**，通过 hook 介入构建生命周期的任意阶段，
  能力更强（HtmlWebpackPlugin、DefinePlugin）

---

## 现在还有什么理由用 Webpack

**能答出这题说明你不是跟风：**

- 复杂的老项目迁移成本高
- 某些 Webpack 特有生态
  （Module Federation 的成熟度、部分微前端方案的深度集成）
- 需要非常定制化的构建流程
- 反过来，**Rspack**（字节的 Rust 版 Webpack）提供了
  "兼容 Webpack 配置 + 接近 Vite 的速度"的第三条路

---

## 你的实际经历

【需确认】你简历里同时有 webpack（PMS、Booking Engine）
和 vite（无双后台、Housekeeping、微信 H5）的项目。

**可以准备一个对比**：
> 燊芒的 PMS 是 webpack，项目大了之后本地启动要一两分钟，
> 改一行代码 HMR 也慢。后来新项目用 vite，
> 启动基本是秒开——这个差异对日常开发效率的影响比想象中大得多，
> 因为它改变的是「改一下看一下」这个循环的成本。

**从开发体验切入比背原理更有说服力。**
