# Vue 3 组件生命周期

## 常用钩子

| 阶段          | Composition API                   | 适合处理                                           |
| ------------- | --------------------------------- | -------------------------------------------------- |
| setup         | `setup()` / `<script setup>` 顶层 | 创建响应式状态、computed、watch；此时无挂载 DOM    |
| 挂载前        | `onBeforeMount`                   | 少见，尚不能读最终 DOM                             |
| 挂载后        | `onMounted`                       | 读 DOM、初始化依赖容器的第三方库                   |
| 更新前/后     | `onBeforeUpdate` / `onUpdated`    | 观察 DOM 更新边界，不要在 `onUpdated` 无条件改状态 |
| 卸载前/后     | `onBeforeUnmount` / `onUnmounted` | 停止订阅、定时器和第三方实例                       |
| 缓存激活/停用 | `onActivated` / `onDeactivated`   | `<KeepAlive>` 缓存实例的恢复与暂停                 |
| 错误          | `onErrorCaptured`                 | 捕获后代组件传播的错误                             |

Options API 中 Vue 2 的 `beforeDestroy` / `destroyed` 在 Vue 3 改名为
`beforeUnmount` / `unmounted`。

## 父子组件常见顺序

初次挂载的典型顺序：

```text
父 setup
父 onBeforeMount
  子 setup
  子 onBeforeMount
  子 onMounted
父 onMounted
```

卸载时，父组件先进入 beforeUnmount，然后卸载子树，
子组件的 unmounted 完成后父组件再 unmounted。
异步组件、Suspense、Teleport 与条件分支会让实际时序更复杂，
业务逻辑应依赖自身钩子语义，不要偷偷依赖兄弟组件的顺序。

## watch 与生命周期

```ts
watch(
	() => props.id,
	async (id, _oldId, onCleanup) => {
		const controller = new AbortController();
		onCleanup(() => controller.abort());
		data.value = await load(id, controller.signal);
	},
	{ immediate: true }
);
```

- 对某个明确数据源变化做响应，用 `watch`，不要把所有逻辑堆在 `onUpdated`。
- `watchEffect` 自动收集同步执行阶段的依赖，方便但来源不如 `watch` 明确。
- 需要更新后 DOM 时使用 `{ flush: 'post' }` 或 `nextTick`；
  `flush: 'sync'` 会失去批处理优势，只在确有必要时使用。

## 资源清理

- 组件 `setup()` 中创建的 Vue watcher 通常会随组件停止；
  在异步回调中后创建的 watcher 需自行保存并停止。
- DOM 事件、WebSocket、第三方实例和手动定时器都要在卸载时对称清理。
- KeepAlive 的 deactivated 不是 unmounted；如果隐藏时不应继续工作，
  要在 `onDeactivated` 单独暂停。
