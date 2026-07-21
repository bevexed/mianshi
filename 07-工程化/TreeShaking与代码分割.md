# Tree Shaking 与代码分割

## Tree Shaking 的原理

- 基于 **ESM 的静态结构**——`import` / `export` 在编译期就能确定，
  不像 `require()` 可以是动态的
- 打包器分析出哪些 export 没被任何地方 import，
  标记后由压缩器删除

### 失效的常见原因（重点，能列出来才算懂）

**1. 模块是 CommonJS**——无法静态分析
```js
import _ from 'lodash'              // ❌ CJS，整个库都打进来
import { debounce } from 'lodash-es' // ✅ ESM
import debounce from 'lodash/debounce' // ✅ 精确路径
```

**2. 副作用**——打包器不敢删可能有副作用的代码
```json
// package.json
{ "sideEffects": false }              // 声明本包无副作用
{ "sideEffects": ["*.css", "*.scss"] } // 精确列出有副作用的文件
```

**3. Babel 把 ESM 转成了 CJS**
`@babel/preset-env` 的 `modules` 要设成 `false`，
把模块转换交给打包器。

**4. 类和对象的属性删不掉**——
tree shaking 是**模块级/导出级**的，
一个类里没用到的方法删不掉。

---

## Code Splitting

三种方式：
- **入口分割**：多入口配置
- **动态导入**：`import()` → 打包器自动分出一个 chunk。
  React 里配合 `React.lazy` + `Suspense`
- **公共依赖提取**：`splitChunks`（Webpack）/ `manualChunks`（Rollup/Vite）

### 核心策略：按「变更频率」分组

- **第三方库很少变** → 单独 chunk，用户长期缓存命中
- **业务代码经常变** → 按路由分割

**反例**：把所有 `node_modules` 打成一个 `vendor.js`，
结果升级一个小库导致**整个 vendor 缓存失效**，
用户要重新下载几百 KB。

---

## chunk 分得越细越好吗

**不是。答"越细越好"就掉坑了：**

- **请求数暴增**——移动端弱网下，
  请求开销可能超过体积节省的收益
- **削弱 gzip 效果**——小文件压缩率低
- HTTP/2 多路复用缓解了但**没有消除**这个问题

> 关联：[04-浏览器与网络/HTTP版本演进.md](../04-浏览器与网络/HTTP版本演进.md)

**原则**：按变更频率分组，而不是按数量分。

---

## 怎么定位打包体积问题

**「先量再改」——这是方法论，比列优化手段重要。**

**1. 先量**
`rollup-plugin-visualizer` / `webpack-bundle-analyzer`
生成可视化，看谁最大。

**2. 常见大头**

| 库 | 问题 | 解法 |
|---|---|---|
| moment | 体积大且默认打包全部 locale | 换 dayjs |
| lodash | 全量引入 | lodash-es / 精确路径 |
| echarts | 全量引入 | 按需引入图表类型 |
| antd 图标 | 全量引入 | 按需 |
| **react-pdf / pdfjs** | **超大** | `React.lazy` 动态导入 |

**3. 再改**——按需引入、动态导入、外部化（CDN + externals）

**4. 验证**——改完再量一次，**留下前后对比数据**

### 你的真实案例

> 我优化微信 H5 打包体积时就是先接了 visualizer 才发现大头在 react-pdf，
> 在那之前我以为是 antd-mobile。
> **不量就改，八成改错地方。**

> 详见 [13-项目深挖/工程汇微信H5-授权与构建优化.md](../13-项目深挖/工程汇微信H5-授权与构建优化.md)
