# nextTick 与异步更新

## 为什么改完数据读不到新 DOM

Vue 不会在每次响应式赋值后立即同步更新 DOM。
它会缓冲同一轮中的更新、对作业去重，再于后续 tick 统一刷新。

```vue
<script setup>
import { nextTick, ref } from 'vue';

const count = ref(0);
const el = ref();

async function increment() {
	count.value++;
	console.log(el.value.textContent); // 可能仍是旧文本
	await nextTick();
	console.log(el.value.textContent); // 该次 Vue DOM 更新已刷新
}
</script>
```

`nextTick()` 返回 Promise，也支持回调形式。它的语义是
“等待当前 Vue 更新队列刷新”，不要简化为“所有异步的最后执行”。

## 何时用

- 状态更新后必须测量已更新 DOM。
- 更新列表后需要滚动到新节点或让其获取焦点。
- 测试中需要等待 Vue 完成渲染（数据请求自身还需单独等待）。

## 何时不用

- 不要为了“保证数据更新”而滥用；响应式数据在赋值后已经更新，
  延迟的是 DOM patch。
- 不要用它代替组件数据流或生命周期。
- 如果需要在 DOM 更新后响应某个数据变化，可考虑
  `watch(source, callback, { flush: 'post' })`。
