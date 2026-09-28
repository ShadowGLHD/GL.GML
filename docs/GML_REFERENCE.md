# GML 语法参考

## 元素

```gml
<section>内容</section>
<image source="/assets/a.webp" />
```

开始和结束标签名称必须完全一致,名称大小写敏感.默认最大嵌套深度由`core/constants.ts` 中的 `MAX_NESTING_DEPTH` 控制.

非自闭合开始标签 `>` 后紧邻的一个 CRLF、LF 或 CR 会由 Tokenizer 直接跳过.结束标签前的换行属于正文并予以保留.

## 静态属性

```gml
<heading level="2">标题</heading>
<list ordered />
```

带引号属性在 AST 中保存为字符串;无值属性保存为布尔值 `true`.同一元素不能出现重复属性

## 动态属性

```gml
<widget :data="rows" :visible="shown" />
```

冒号属性产生 `BindingAttributeNode`.引号中的内容是参数名称,不是 JavaScript表达式.所有属性都会传给组件,由组件自行决定如何处理.

参数名称会去除前后空白，并使用与正文参数相同的名称校验规则。例如 `:data=" user_name "`
等价于 `:data="user_name"`。空名称、`user.name`、`fn()` 或包含内部空白的名称会产生
`INVALID_PARAMETER`，不会被解释为属性路径或表达式。

## 文本参数

```gml
你好,{{ user_name }}
```

合法占位符产生 `ParameterNode`.渲染器从一级参数 `user_name` 读取值.

名称可以使用中文、字母、数字、下划线和连字符，但不能包含空白、控制字符或
`core/constants.ts` 中列出的标点。非法占位符（例如 `{{ user.name }}`）保留为字面文本；
缺少 `}}` 时也按文本处理，之后的标签和转义仍正常识别。

页面传入的普通对象会自动展开, 例如 `{ user: { name: 'Alice' } }` 可以使用 `{{ user_name }}`.

普通文本和`<code>` 正文不会在渲染阶段再次识别占位符

## 注释

```gml
<!-- comment -->
```

Tokenizer 始终校验注释.是否将合法注释写入 AST 由 `PRESERVE_COMMENTS` 控制

默认渲染器即使收到 `CommentNode` 也不会显示它

## 代码

```gml
<code language="typescript">
const value = 1 < 10
</code>
```

小写 `<code>` 的正文产生 `CodeNode`,内部标签和参数语法不会继续解析. 它使用与普通元素相同的开始标签换行规则, 结束标签前的换行属于代码正文并予以保留

代码结束标签与普通结束标签一样允许名称前后空白，例如 `</code >` 和 `</ code>`。
`</codes>`、`</Code>` 或带属性的 `</code x>` 不会结束代码块。

代码中用 `\</code>` 输出字面的 `</code>`；相同规则适用于带空白的结束标签。
紧邻结束标签的连续反斜杠为奇数时，最后一个反斜杠转义结束标签并被移除；为偶数时，
结束标签正常生效。其余反斜杠保持原样。

## 转义与错误

反斜杠可用于让具有语法意义的字符按文本处理.

语法错误抛出 `GmlSyntaxError`, 其中包含稳定错误码和源码位置

标签、注释和代码块未闭合分别使用 `UNCLOSED_TAG`、`UNCLOSED_COMMENT`、`UNCLOSED_CODE`，
位置指向对应的开始 `<`。字符串未闭合指向起始引号；非法动态参数名指向属性值的起始引号。

`offset` 从 0 开始，`line`、`column` 从 1 开始；offset 和 column 按 UTF-16 代码单元计数。
CR、LF 和 CRLF 都算一次换行。Token / AST 的 range 是左闭右开的源码范围，转义后的
value 长度不一定等于 range 长度。

## 默认 Vue 标签

默认注册表提供:`title`,`section`,`heading`,`paragraph`,`image`,`code`,`list`,`item`,`strong`,`emphasis` 和 `link`

项目可以覆盖或删除任意默认定义
