import type { GmlMessages } from './types'

export const messages = {
  unclosedTag: (tagName) => `标签${tagName}未闭合`,
  unclosedString: '属性值字符串未闭合',
  invalidName: (character) => `存在非法字符：${JSON.stringify(character)}`,
  unexpectedCharacter: (character) => `属性值包含非法字符：${JSON.stringify(character)}`,
  unexpectedToken: (tokenType) => `无法处理的 Token：${tokenType}`,
  missOpenTag: '此处应为开始标签',
  missOpenTagName: '开始标签缺少标签名',
  missOpenTagEnd: (tagName) => `标签 <${tagName}> 后缺少 >`,
  missCloseTagName: '结束标签缺少标签名',
  mismatchedTag: (expected, actual) => `期望结束标签 </${expected}>，实际得到 </${actual}>`,
  maxDepth: (maxDepth) => `标签嵌套层数超过允许的最大值 ${maxDepth}`,
  missCloseTagEnd: (tagName) => `结束标签 </${tagName}> 后缺少 >`,
  duplicateAttribute: (attributeName) => `属性 ${attributeName} 重复声明`,
  missAttributeEquals: (attributeName) => `属性 ${attributeName} 后缺少 =`,
  unquotedAttribute: (attributeName) => `属性 ${attributeName} 的值必须使用引号`,
  missingEofToken: 'GML Parser 收到的 Token 序列缺少 EOF',
  invalidMaxDepth: (value) => `GML 最大嵌套层数必须是正整数，当前值：${String(value)}`,
  unsupportedTag: (tagName) => `发现未注册标签: ${tagName}`,
} satisfies GmlMessages
