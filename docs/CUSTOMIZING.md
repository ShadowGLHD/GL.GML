# 渲染层定制

复制后的 `renderer` 属于目标项目,可以直接修改.建议优先从注册表和组件开始,尽量
保持 Core 的 AST 协议稳定.

## 覆盖标签组件

```ts
import ProjectImage from './ProjectImage.vue'
import type { GmlComponentRegistry } from '@gl/gml/vue'

export const projectRegistry: GmlComponentRegistry = {
  image: {
    component: ProjectImage,
    attributes: ['source', 'alt'],
  },
}
```

```vue
<GmlRenderer :document="document" :registry="projectRegistry" />
```

自定义注册表会覆盖同名默认定义.标签名大小写敏感.

## 增加新标签

1. 在 `renderer/components` 创建 Vue 组件.
2. 在 `renderer/registry.ts` 注册标签名.
3. 明确列出允许进入组件的属性.
4. 必要时使用 `transformAttributes` 做类型转换和校验.
5. 在 Playground 中验证正常值, 缺失值和危险值.

```ts
notice: {
  component: GmlNotice,
  attributes: ['level'],
  transformAttributes: (attributes) => ({
    level: attributes.level === 'warning' ? 'warning' : 'info',
  }),
}
```

## 修改默认视觉样式

快速定制可以只覆盖 `renderer/theme.css` 中的变量:

```css
.gml-renderer {
  --ark-state: #7c3aed;
  --ark-line: #ddd6fe;
  --font-display: 'Noto Sans SC', sans-serif;
}
```

结构差异较大时,直接修改或替换 `renderer/components/*.vue`.

## 改变节点渲染规则

`GmlNodeRenderer.vue` 是递归分发中心.可以在这里改变参数缺失策略,未知标签策略,节点
包装方式或插槽行为.`renderer.ts` 适合放无副作用,可单测的数据转换逻辑.

若修改 AST 形状,应同时更新:

- `core/types.ts`
- `core/parser.ts`
- `renderer/GmlNodeRenderer.vue`
- `renderer/renderer.ts`
- Playground 示例和 `docs/GML_REFERENCE.md`

## 动态属性

```gml
<list :items="rows" :visible="shown" />
```

渲染器只读取:

```ts
parameters.rows
parameters.shown
```

不会解析 `user.name`,`fn()` 或 `count + 1`.如果项目需要表达式,请先设计受控表达式
语言和资源限制,不要直接使用 `eval` 或 `new Function`.
