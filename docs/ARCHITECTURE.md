# 架构与数据流

## 边界

```text
GML
  -> core/tokenizer.ts
  -> Token[]
  -> core/parser.ts
  -> DocumentNode (AST)
  -> renderer/GmlRenderer.vue
  -> project Vue components
```

`core` 不导入 Vue,也不知道任何业务标签对应哪个组件.`renderer` 只通过 `core` 的公共
入口读取 AST 类型和校验函数.因此项目可以保留 Core,只替换整个渲染层.

仓库中的 `playground` 是独立的单页面演示入口,直接引用 `src`,不会复制第二份 Core 或 Renderer. 它同时用于人工验证源码编辑, 参数解析, AST 输出和组件渲染

## Core

- `tokenizer.ts`: 使用 text / tag / raw-code 状态扫描字符，产生带源码位置的 Token。
  参数结束符按游标前进缓存，普通文本分段收集后合并，避免反复搜索或拼接。
  原始代码只识别正文边界，结束标签复用普通标签扫描流程。
- `parser.ts`: 递归下降解析；文档与元素共用子节点循环，嵌套深度随调用传递。
  独立处理属性和结束标签，生成 AST 并检查嵌套、属性、参数名称与闭合标签。
- `types.ts`: Token, AST 节点和稳定错误码.
- `errors.ts`: 集中构造 `GmlSyntaxError`.
- `tokenizer.ts` 内联字符与名称规则，并在读取动态属性字符串时检查参数名称。
  Parser 信任 Token 的词法合法性；手工构造 Token 的调用方应保证名称和值合法。
- `constants.ts`: Tokenizer 与 Parser 的默认行为常量.

Core 的公共入口为 `core/index.ts`,模板根入口 `src/index.ts` 再次导出它.

解析入口仅提供 `parseGml(source)`、`tokenizeGml(source)` 和 `parseGmlTokens(tokens)`。
Tokenizer / Parser 类及异常工厂属于内部实现，每次函数调用使用独立状态。
`parseGmlTokens` 接收只读 Token 数组，可重复解析同一份输入。输入必须有且仅有一个末尾 EOF；
缺失、提前或重复的 EOF 抛出普通 `Error`，源码语法错误则抛出 `GmlSyntaxError`。

本轮 Core 重构调整了公共契约：不再导出 `GmlTokenizer`、`GmlParser` 和 `errorManager`；
动态绑定名先去除前后空白再校验；未闭合注释和代码块具有独立错误码，未闭合标签定位到 `<`。
未使用的 `UNEXPECTED_CHARACTER`、`UNEXPECTED_EOF` 错误码和最大深度配置错误文案已移除。

`npm run bench:core` 可独立测量不同长度的未闭合花括号、普通文本、转义文本及完整文档。
基准预热后取七次运行的中位数，不把机器相关的毫秒阈值作为单元测试条件。

`locales/` 为 Core 和 Renderer 提供无框架依赖的诊断语言包。开发者通过
`locales/index.ts` 的固定导出选择中文或英文，语言包结构由 `locales/types.ts` 约束。
语言选择只改变文案，不参与解析流程；使用方式见 [复制与集成](INTEGRATION.md#选择诊断语言)。

## Renderer

- `GmlRenderer.vue`:接收 GML 源字符串并在组件内部通过 Core 解析.组件随后在单个实例中
  合并注册表和扁平化参数,再通过普通渲染函数递归遍历 AST 并生成 Vue VNode.
- `renderer.ts`:对象展开,属性传递,参数读取和未知标签统计.
- `registry.ts`:标签名到 Vue 组件的默认映射,所有属性由组件自行处理.
- `components/`:默认标签组件,最常被项目替换或修改.
- `theme.css`:默认 CSS 变量,不包含业务应用的全局样式.

## 节点处理

| AST 节点    | 默认处理                                      |
| ----------- | --------------------------------------------- |
| `text`      | 输出字面文本,不再次解析参数                   |
| `parameter` | 从扁平 `params` 对象精确读取名称              |
| `code`      | 原样输出,不进行参数替换                       |
| `comment`   | 不显示                                        |
| `element`   | 查注册表并创建 Vue 组件,然后递归渲染 children |

未注册元素采用透明容器策略:忽略外层标签,但继续显示其 children. `GmlRenderer` 会通过
`debug` 事件返回未知标签汇总,供开发环境或业务诊断界面展示.

页面参数中的普通对象会在渲染入口自动展开为下划线名称,例如 `user.name` 对应 `user_name`.
数组不会展开,会作为完整值传给组件.

## 安全边界

- 默认渲染器不用 `v-html`
- 元素的全部属性都会传给对应组件,组件自行校验和过滤
- 动态参数只按完整键名读取,不执行表达式,函数或嵌套路径
- 默认链接和图片组件会过滤 URL 协议
- 自定义组件接收数据后仍需自行验证 URL,样式,事件和复杂对象
