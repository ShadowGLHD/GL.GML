# GML 语法参考

## 元素

```gml
<section>内容</section>
<image source="/assets/a.webp" />
```

开始和结束标签名称必须完全一致,名称大小写敏感.默认最大嵌套深度由
`core/constants.ts` 中的 `MAX_NESTING_DEPTH` 控制.

## 静态属性

```gml
<heading level="2">标题</heading>
<list ordered />
```

带引号属性在 AST 中保存为字符串;无值属性保存为布尔值 `true`.同一元素不能出现
重复属性.

## 动态属性

```gml
<widget :data="rows" :visible="shown" />
```

冒号属性产生 `BindingAttributeNode`.引号中的内容是参数名称,不是 JavaScript
表达式.只有注册表白名单允许的属性才会传给组件.

## 文本参数

```gml
你好,{{ username }}
```

合法占位符产生 `ParameterNode`.渲染器从 `parameters.username` 读取值.普通文本和
`<code>` 正文不会在渲染阶段再次识别占位符.

## 注释

```gml
<!-- comment -->
```

Tokenizer 始终校验注释.是否将合法注释写入 AST 由 `PRESERVE_COMMENTS` 控制;默认
渲染器即使收到 `CommentNode` 也不会显示它.

## 代码

```gml
<code language="typescript">
const value = 1 < 10
</code>
```

小写 `<code>` 的正文产生 `CodeNode`,内部标签和参数语法不会继续解析.是否裁剪代码
边界各一个排版换行由 `TRIM_CODE_BOUNDARY_NEWLINES` 控制.

## `trim` 渲染指令

```gml
<paragraph trim>
正文
</paragraph>
```

`trim` 只影响渲染副本中首尾文本节点各一个换行,不修改 Parser 返回的 AST,也不会作为
Prop 传给业务组件.

## 转义与错误

反斜杠可用于让具有语法意义的字符按文本处理.语法错误抛出 `GmlSyntaxError`,其中包含
稳定错误码和源码位置.调用方应捕获并向用户显示适合当前界面的错误信息.

## 默认 Vue 标签

默认注册表提供:`title`,`section`,`heading`,`paragraph`,`image`,`code`,`list`,
`item`,`strong`,`emphasis` 和 `link`.项目可以覆盖或删除任意默认定义.
