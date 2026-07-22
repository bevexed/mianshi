# Vue 3 组件通信

## 常用方式

| 关系           | 方式                 | 边界                                       |
| -------------- | -------------------- | ------------------------------------------ |
| 父 → 子        | props                | 子组件不应直接修改 prop                    |
| 子 → 父        | emits / `v-model`    | 事件名和 payload 应显式声明                |
| 父定义内容结构 | slots                | 作用域插槽可向父模板暴露子组件数据         |
| 跨层依赖       | `provide` / `inject` | 适合组件树内的依赖注入，不是默认全局 store |
| 跨页/领域共享  | Pinia                | 只放真正需要共享的客户端状态               |

## props 与 emits

```vue
<script setup lang="ts">
const props = defineProps<{ modelValue: string; disabled?: boolean }>();
const emit = defineEmits<{
	'update:modelValue': [value: string];
	submit: [value: string];
}>();

function update(value: string) {
	emit('update:modelValue', value);
}
</script>
```

prop 的对象/数组内部属性在 JavaScript 层面仍可能被修改，
但这会造成隐式的父状态变更。应由父组件通过事件更新数据，
或在子组件内建立明确的本地草稿。

## provide / inject

```ts
const FormKey = Symbol('form') as InjectionKey<FormContext>;

// 祖先组件
provide(FormKey, readonly(formContext));

// 后代组件
const form = inject(FormKey);
if (!form) throw new Error('FormField 必须在 Form 内使用');
```

- TypeScript 中使用 `InjectionKey<T>` 统一键和值类型。
- 只读数据可以用 `readonly` 暴露，变更方法由 provider 显式提供。
- `inject` 只按组件层级查找，这种隐式依赖需要文档和稳定的 key。

## 不推荐的方式

- 用全局 event bus 承载主要业务状态：事件来源、时序和清理难追踪。
- 通过多层 props 传递所有东西：先看是否能组件组合，再考虑 provide/inject 或 store。
- 为方便而把所有状态放 Pinia：会放大生命周期、持久化和测试成本。
