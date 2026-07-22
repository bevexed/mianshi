# KeepAlive 组件缓存

`<KeepAlive>` 缓存切换离开的动态组件实例，保留其本地状态和 DOM，
再次切回时复用，而不是重新挂载。

```vue
<RouterView v-slot="{ Component }">
  <KeepAlive :include="['UserList']" :max="10">
    <component :is="Component" />
  </KeepAlive>
</RouterView>
```

## 生命周期

- 第一次进入：正常挂载，然后调用 `onActivated`。
- 切走但仍被缓存：调用 `onDeactivated`，不是 `onUnmounted`。
- 再次进入：调用 `onActivated`，不重跑完整挂载流程。
- 缓存被淘汰或父树卸载：最终仍会卸载。

## 常见用途

- 列表 → 详情 → 返回列表时保留筛选、分页和滚动位置。
- 多步编辑器在切换页签时保留未提交状态。
- 初始化成本高、但不宜常驻展示的组件。

## 风险与边界

- 缓存不等于数据新鲜。可在 `onActivated` 中按需重新验证，
  不要无条件每次全量请求。
- 被 deactivated 的实例仍占内存；使用 `include` / `exclude` / `max`
  限制范围，不要包住所有路由。
- 订阅、定时器不一定会在 deactivated 时自动停止；
  需要按业务在 `onDeactivated` 暂停，在 `onActivated` 恢复。
- `include` / `exclude` 按组件 `name` 匹配，匿名或名称不稳定会导致规则不生效。
