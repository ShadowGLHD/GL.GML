# 渲染层定制

复制后的 `renderer` 属于目标项目,可以直接修改.建议优先从注册表和组件开始,尽量
保持 Core 的 AST 协议稳定.

## 覆盖标签组件

```ts
import ProjectImage from './ProjectImage.vue'
import type { GmlRegistry } from '@gl/gml/vue'

export const projectRegistry: GmlRegistry = {
  image: ProjectImage,
}
```

```vue
<GmlRenderer :gml="source" :registry="projectRegistry" />
```

自定义注册表会覆盖同名默认定义.标签名大小写敏感. 组件会接收元素的全部属性, 由组件自己
通过 `defineProps` 决定需要哪些属性和类型.

## 增加新标签

1. 在 `renderer/components` 创建 Vue 组件.
2. 在 `renderer/registry.ts` 注册标签名.
3. 在组件中声明需要的 Props.
4. 在组件中完成类型转换和校验.
5. 在 Playground 中验证正常值, 缺失值和危险值.

```ts
notice: GmlNotice
```

## 选择颜色主题

渲染器内置 `light` 和 `dark` 两个主题, 默认使用 `light`:

```vue
<GmlRenderer :gml="source" theme="light" />
<GmlRenderer :gml="source" theme="dark" />
```

`theme` 是组件的公开接口。渲染器会在内部将它输出为根节点的 `data-theme` 属性,
调用方不需要直接创建或操作该属性。

### 页面专属主题

主题通常只服务于特定页面时, 可以把主题 CSS 放在页面目录中并由页面组件导入:

```text
pages/Article/
├─ ArticlePage.vue
└─ ocean.css
```

```css
/* ocean.css */
.gml-renderer[data-theme='ocean'] {
  --color-background: #071a2b;
  --color-text: #d8f3ff;
  --color-text-secondary: #83a9bd;
  --ark-ink: #e0f2fe;
  --ark-line: #1e526d;
  --ark-signal: #facc15;
  --ark-state: #22d3ee;
  --ark-muted: #7da2b5;
  --ark-code-surface: #0b2538;
  --ark-on-code: #e0f2fe;
}

/* 自定义主题不限于变量, 也可以修改主题范围内的组件样式。 */
.gml-renderer[data-theme='ocean'] .gml-code {
  border-left: 3px solid #22d3ee;
  border-radius: 0;
}
```

```vue
<!-- ArticlePage.vue -->
<script setup lang="ts">
import { GmlRenderer } from '@gl/gml/vue'
import '@gl/gml/renderer/theme.css'
import './ocean.css'

const source = '<paragraph>页面专属主题</paragraph>'
</script>

<template>
  <GmlRenderer :gml="source" theme="ocean" />
</template>
```

不需要在项目入口导入页面专属主题, 也不需要修改 TypeScript 导出文件。若在 Vue SFC
中直接编写主题样式, 应使用非 `scoped` 的 `<style>`; 在 `scoped` 样式中则需要通过
`:deep(.gml-renderer[data-theme='ocean'])` 选择子组件。

结构差异较大时,直接修改或替换 `renderer/components/*.vue`.

## 改变节点渲染规则

`GmlRenderer.vue` 是单组件渲染入口.其中的普通渲染函数负责递归遍历 AST,可以在这里
改变参数缺失策略,未知标签策略,节点包装方式或插槽行为.`renderer.ts` 适合放无副作用,
可单独验证的数据转换逻辑.

`params` 中的普通对象会在渲染入口自动展开:

```ts
{ user: { name: 'Alice', age: 5 }, rows: [{ id: 1 }] }
```

可以在 GML 中使用 `{{ user_name }}` 和 `{{ user_age }}`. 数组 `rows` 保持完整值,可通过
`:items="rows"` 传给组件.

若修改 AST 形状,应同时更新:

- `core/types.ts`
- `core/parser.ts`
- `renderer/GmlRenderer.vue`
- `renderer/renderer.ts`
- Playground 示例和 `docs/GML_REFERENCE.md`

## 动态属性

```gml
<list :items="rows" :visible="shown" />
```

渲染器只读取 `params` 中的值:

```ts
params.rows
params.shown
```

不会解析 `user.name`,`fn()` 或 `count + 1`.如果项目需要表达式,请先设计受控表达式
语言和资源限制,不要直接使用 `eval` 或 `new Function`.
