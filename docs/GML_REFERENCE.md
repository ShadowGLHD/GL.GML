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

## 文本参数

```gml
你好,{{ user_name }}
```

合法占位符产生 `ParameterNode`.渲染器从一级参数 `user_name` 读取值.

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

## 转义与错误

反斜杠可用于让具有语法意义的字符按文本处理.

语法错误抛出 `GmlSyntaxError`, 其中包含稳定错误码和源码位置

## 默认 Vue 标签

默认注册表提供:`title`,`section`,`heading`,`paragraph`,`image`,`code`,`list`,`item`,`strong`,`emphasis` 和 `link`

项目可以覆盖或删除任意默认定义
