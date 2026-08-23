/** GML 源码中的字符位置; 行列从 1 开始, offset 从 0 开始 */
export interface SourcePosition {
  offset: number
  line: number
  column: number
}

/** 左闭右开的源码范围 */
export interface SourceRange {
  start: SourcePosition
  end: SourcePosition
}

/** Tokenizer 能识别的最小语法单位类型 */
export type TokenType =
  | 'OPEN_TAG'
  | 'CLOSE_TAG'
  | 'END_TAG'
  | 'SELF_CLOSE'
  | 'COLON'
  | 'NAME'
  | 'EQUALS'
  | 'STRING'
  | 'TEXT'
  | 'PARAMETER'
  | 'COMMENT'
  | 'RAW_CODE'
  | 'EOF'

/** Tokenizer 输出结构 */
export interface Token {
  type: TokenType
  value: string
  range: SourceRange
}

/** GML AST 节点类型 */
export type GmlNode = DocumentNode | ElementNode | TextNode | ParameterNode | CommentNode | CodeNode

// 根节点
export interface DocumentNode {
  type: 'document'
  children: GmlNode[]
}

export interface ElementNode {
  type: 'element'
  name: string
  attributes: AttributeNode[]
  children: GmlNode[]
  range: SourceRange
}

/** 属性节点 */
export type AttributeNode = StaticAttributeNode | BindingAttributeNode

/** 普通属性: 无值属性为 true */
export interface StaticAttributeNode {
  type: 'attribute'
  name: string
  value: string | true
  range: SourceRange
}

/** 动态属性 */
export interface BindingAttributeNode {
  type: 'binding'
  name: string
  parameter: string
  range: SourceRange
}

/** 文本节点 */
export interface TextNode {
  type: 'text'
  value: string
  range: SourceRange
}

/** 参数节点 {{ param }} */
export interface ParameterNode {
  type: 'parameter'
  name: string
  range: SourceRange
}

/** 注释节点 */
export interface CommentNode {
  type: 'comment'
  value: string
  range: SourceRange
}

/** 代码节点 */
export interface CodeNode {
  type: 'code'
  value: string
  range: SourceRange
}

/** 稳定错误码用于程序判断；面向用户的错误消息保持中文。 */
export type GmlErrorCode =
  | 'INVALID_NAME'
  | 'UNEXPECTED_CHARACTER'
  | 'UNEXPECTED_EOF'
  | 'UNCLOSED_STRING'
  | 'UNCLOSED_COMMENT'
  | 'UNQUOTED_ATTRIBUTE'
  | 'DUPLICATE_ATTRIBUTE'
  | 'UNCLOSED_TAG'
  | 'MISMATCHED_TAG'
  | 'MAX_NESTING_DEPTH'
  | 'UNCLOSED_CODE'
  | 'UNEXPECTED_TOKEN'
