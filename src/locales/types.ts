/**
 * Core 异常与 Renderer 诊断共用的语言包契约。
 * 语言包只格式化文案；错误码、位置与异常类型由 Core 决定，不随语言切换。
 */
export interface GmlMessages {
  unclosedTag: (tagName: string) => string
  /** 分别用于注释与原始代码模式，避免将所有未闭合情况都描述为标签错误。 */
  unclosedComment: string
  unclosedCode: string
  unclosedString: string
  invalidName: (character: string) => string
  /** 接收源码解码后、trim 前的参数值，便于在诊断中显示空字符串或多余空白。 */
  invalidParameter: (parameter: string) => string
  unexpectedToken: (tokenType: string) => string
  missOpenTagName: string
  missOpenTagEnd: (tagName: string) => string
  missCloseTagName: string
  mismatchedTag: (expected: string, actual: string) => string
  maxDepth: (maxDepth: number) => string
  missCloseTagEnd: (tagName: string) => string
  duplicateAttribute: (attributeName: string) => string
  missAttributeEquals: (attributeName: string) => string
  unquotedAttribute: (attributeName: string) => string
  missingEofToken: string
  /** 提前或重复 EOF 属于解析 API 调用错误，不是源文档语法诊断。 */
  invalidTokenSequence: string
  unsupportedTag: (tagName: string) => string
}
