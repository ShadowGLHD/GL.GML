# 复制与集成

## 前提

- 目标项目使用 Vue 3 和 TypeScript
- 目标项目已经安装 Vue
- 建议使用 Node.js 20.19+ 或 22.12+

## 使用 degit 复制 GML

```powershell
npx --yes degit ShadowGLHD/GL.GML/src src/lib/gml
```

`degit` 从 `ShadowGLHD/GL.GML` 获取 `src` 目录的文件快照. 它不创建子模块, 也不保留模板仓库的 Git 关联. 

目标目录必须为空或不存在, 避免覆盖项目修改

## 导入入口

```ts
import { GmlRenderer, defaultGmlRegistry } from '@gl/gml/vue'
import '@gl/gml/renderer/theme.css'
```

公共 API 应从上述入口导入. 只有修改内部实现时才直接引用 `parser.ts` 或 `renderer.ts`.

## 使用 `@gl/gml` 项目别名

目标项目通过 Vite 和 TypeScript 路径别名提供 `@gl/gml` 导入入口. Vite 配置:

```ts
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@gl/gml': fileURLToPath(new URL('./src/lib/gml', import.meta.url)),
    },
  },
})
```

TypeScript:

```json
{
  "compilerOptions": {
    "paths": {
      "@gl/gml": ["./src/lib/gml/index.ts"],
      "@gl/gml/vue": ["./src/lib/gml/vue.ts"],
      "@gl/gml/*": ["./src/lib/gml/*"]
    }
  }
}
```

配置后可以使用:

```ts
import { GmlRenderer } from '@gl/gml/vue'
```

该配置将 `@gl/gml` 映射到目标项目中的 `src/lib/gml`.

## 最小使用示例

```vue
<script setup lang="ts">
import { GmlRenderer } from '@gl/gml/vue'

const props = defineProps<{ source: string }>()
</script>

<template>
  <GmlRenderer :gml="props.source" />
</template>
```

`GmlRenderer` 会在内部调用 Core 解析源码,并通过 `debug` 事件返回诊断数组.
没有诊断信息时事件值为空数组 `[]`.
需要自定义诊断界面时,可以监听该事件:

```vue
<GmlRenderer :gml="props.source" @debug="handleDebug" />
```

## 选择诊断语言

Core 异常和 Renderer 的未注册标签警告共用 `src/locales` 下的语言包，默认使用中文。
复制到目标项目后，修改 `src/lib/gml/locales/index.ts` 中的导出即可选择英文：

```ts
export { messages } from './en-US'
```

使用中文时导出 `./zh-CN`。保存修改后重新构建项目；无需向解析函数或 Vue 组件传入语言参数。
仓库内开发时，对应文件为 `src/locales/index.ts`。

新增语言时，参考已有语言包创建文件，并用 `satisfies GmlMessages` 校验完整性。
`GmlMessages` 定义在 `locales/types.ts` 中；带变量的消息使用函数，其他消息使用字符串。
新增消息键时，需要同步补齐所有语言包。

语言选择只影响诊断文案，不改变错误码、源码位置、异常类型或遇错中断解析的行为。
Playground 页面文字不属于这套语言包。

## 不使用默认主题

删除这条导入即可:

```ts
import '@gl/gml/renderer/theme.css'
```

随后由项目全局样式提供组件中使用的变量, 或直接修改组件样式
