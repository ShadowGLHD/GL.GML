# 架构与数据流

## 边界

```text
GML
  -> core/tokenizer.ts
  -> Token[]
  -> core/parser.ts
  -> DocumentNode (AST)
  -> renderer/GmlNodeSelector.vue
  -> project Vue components
```

`core` 不导入 Vue,也不知道任何业务标签对应哪个组件.`renderer` 只通过 `core` 的公共
入口读取 AST 类型和校验函数.因此项目可以保留 Core,只替换整个渲染层.

仓库中的 `playground` 是独立的单页面演示入口,直接引用 `src`,不会复制第二份 Core 或 Renderer. 它同时用于人工验证源码编辑, 参数解析, AST 输出和组件渲染

## Core

- `tokenizer.ts`: 扫描字符,产生带源码位置的 Token.
- `parser.ts`: 递归下降解析,生成 AST 并检查嵌套,属性与闭合标签.
- `types.ts`: Token, AST 节点和稳定错误码.
- `errors.ts`: 集中构造 `GmlSyntaxError`.
- `validate.ts`: GML 名称和字符校验.
- `constants.ts`: Tokenizer 与 Parser 的默认行为常量.

Core 的公共入口为 `core/index.ts`,模板根入口 `src/index.ts` 再次导出它.

## Renderer

- `GmlNodeSelector.vue`:接收统一的 `GmlNode`,在单个组件实例中合并注册表和扁平化参数,
  再通过普通渲染函数递归遍历 AST 并生成 Vue VNode. `DocumentNode` 也是 `GmlNode` 的一种,
  因此文档和单节点走同一个入口.
- `renderer.ts`:对象展开,属性传递,参数读取和未知标签统计.
- `registry.ts`:标签名到 Vue 组件的默认映射,所有属性由组件自行处理.
- `components/`:默认标签组件,最常被项目替换或修改.
- `theme.css`:默认 CSS 变量,不包含业务应用的全局样式.

## 节点处理

| AST 节点    | 默认处理                                      |
| ----------- | --------------------------------------------- |
| `text`      | 输出字面文本,不再次解析参数                   |
| `parameter` | 从扁平 `parameters` 对象精确读取名称          |
| `code`      | 原样输出,不进行参数替换                       |
| `comment`   | 不显示                                        |
| `element`   | 查注册表并创建 Vue 组件,然后递归渲染 children |

未注册元素采用透明容器策略:忽略外层标签,但继续显示其 children. 默认组件不显示未知
标签汇总. 开发者可以调用 `collectTags` 自行设计提示内容和展示位置.

页面参数中的普通对象会在渲染入口自动展开为下划线名称,例如 `user.name` 对应 `user_name`.
数组不会展开,会作为完整值传给组件.

## 安全边界

- 默认渲染器不用 `v-html`
- 元素的全部属性都会传给对应组件,组件自行校验和过滤
- 动态参数只按完整键名读取,不执行表达式,函数或嵌套路径
- 默认链接和图片组件会过滤 URL 协议
- 自定义组件接收数据后仍需自行验证 URL,样式,事件和复杂对象
