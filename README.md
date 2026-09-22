# GL.GML

GL.GML 是一个可复制到 Vue 3 项目中并独立修改的 GML 模板. 模板仓库提供可工作的
Core 和 Vue Renderer

## 一键复制到项目

安装了 Node.js 的情况下, 在目标 Vue 项目根目录执行:

```powershell
npx --yes degit ShadowGLHD/GL.GML/src src/lib/gml
```

该命令从 `ShadowGLHD/GL.GML` 复制 `src` 目录到目标项目, 不复制 Git 历史和仓库配置.
目标项目不需要预先存在 `GL.GML`. 复制完成后将 GML 纳入目标项目:

```powershell
git add src/lib/gml
git commit -m "添加项目本地 GML"
```

## 在 Vue 项目中使用

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { parseGml } from '@gl/gml'
import { GmlRenderer } from '@gl/gml/vue'
import '@gl/gml/renderer/theme.css'

const source = '<paragraph>你好, {{ name }}</paragraph>'
const document = computed(() => parseGml(source))
</script>

<template>
  <GmlRenderer :gml="document" :parameters="{ name: 'World' }" />
</template>
```

### 配置 `@gl/gml` 导入名

目标项目通过 Vite 和 TypeScript 路径别名提供 `@gl/gml` 导入入口:

```ts
// vite.config.ts
import { fileURLToPath, URL } from 'node:url'

resolve: {
  alias: {
    '@gl/gml': fileURLToPath(new URL('./src/lib/gml', import.meta.url)),
  },
}
```

```json
// tsconfig.app.json 的 compilerOptions.paths
{
  "@gl/gml": ["./src/lib/gml/index.ts"],
  "@gl/gml/vue": ["./src/lib/gml/vue.ts"],
  "@gl/gml/*": ["./src/lib/gml/*"]
}
```

之后即可写成:

```ts
import { parseGml } from '@gl/gml'
import { GmlRenderer } from '@gl/gml/vue'
import '@gl/gml/renderer/theme.css'
```

`@gl/gml` 映射到目标项目中的 `src/lib/gml`.

## 仓库开发

```powershell
npm install
npm run check
```

公共入口:

- `src/index.ts`: 只导出 Core, 不引入 Vue
- `src/vue.ts`: 导出 Vue 渲染层
- `src/renderer/theme.css`: 可选默认主题变量
- `playground/`: 单页面交互示例, 展示 GML, 参数, 预览和 AST

## Playground

本地启动交互页面:

```powershell
npm run dev:playground
```

## 文档

- [架构与数据流](docs/ARCHITECTURE.md)
- [复制与集成](docs/INTEGRATION.md)
- [渲染层定制](docs/CUSTOMIZING.md)
- [GML 语法参考](docs/GML_REFERENCE.md)
- [模板维护说明](CONTRIBUTING.md)
