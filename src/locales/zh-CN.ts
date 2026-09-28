import type { GmlMessages } from './types'

export const messages = {
  /** UNCLOSED_TAG：标签未闭合；tagName 为含尖括号的显示名称，也可能为空。 */
  unclosedTag: (tagName) => `标签${tagName}未闭合`,
  /** UNCLOSED_COMMENT：注释缺少 -->。 */
  unclosedComment: '注释未闭合',
  /** UNCLOSED_CODE：代码块缺少结束标签。 */
  unclosedCode: '代码块 <code> 未闭合',
  /** UNCLOSED_STRING：属性值缺少与起始引号配对的结束引号。 */
  unclosedString: '属性值字符串未闭合',
  /** INVALID_NAME：名称中出现非法字符；JSON.stringify 使换行等不可见字符可读。 */
  invalidName: (character) => `存在非法字符：${JSON.stringify(character)}`,
  /** INVALID_PARAMETER：动态绑定的参数名为空或含非法字符。 */
  invalidParameter: (parameter) => `参数名称无效：${JSON.stringify(parameter)}`,
  /** UNEXPECTED_TOKEN：当前节点位置无法处理该 Token；tokenType 为 Token 类型名称。 */
  unexpectedToken: (tokenType) => `无法处理的 Token：${tokenType}`,
  /** UNEXPECTED_TOKEN：开始标签的 < 后缺少名称。 */
  missOpenTagName: '开始标签缺少标签名',
  /** UNEXPECTED_TOKEN：开始标签的属性结束后缺少 >；tagName 不含尖括号。 */
  missOpenTagEnd: (tagName) => `标签 <${tagName}> 后缺少 >`,
  /** UNEXPECTED_TOKEN：结束标签的 </ 后缺少名称。 */
  missCloseTagName: '结束标签缺少标签名',
  /** MISMATCHED_TAG：结束标签不匹配；expected、actual 均为不含尖括号的名称。 */
  mismatchedTag: (expected, actual) => `期望结束标签 </${expected}>，实际得到 </${actual}>`,
  /** MAX_NESTING_DEPTH：即将进入的元素超出最大嵌套层数；maxDepth 为允许的上限。 */
  maxDepth: (maxDepth) => `标签嵌套层数超过允许的最大值 ${maxDepth}`,
  /** UNEXPECTED_TOKEN：结束标签名称后缺少 >；tagName 不含尖括号。 */
  missCloseTagEnd: (tagName) => `结束标签 </${tagName}> 后缺少 >`,
  /** DUPLICATE_ATTRIBUTE：同一元素重复声明属性，静态属性和动态绑定共用名称检查。 */
  duplicateAttribute: (attributeName) => `属性 ${attributeName} 重复声明`,
  /** UNEXPECTED_TOKEN：需要赋值的属性缺少 =，例如动态绑定 :source。 */
  missAttributeEquals: (attributeName) => `属性 ${attributeName} 后缺少 =`,
  /** UNQUOTED_ATTRIBUTE：属性的 = 后不是带单引号或双引号的值。 */
  unquotedAttribute: (attributeName) => `属性 ${attributeName} 的值必须使用引号`,
  /** 普通 Error：Parser 读不到预期的 EOF Token，表示传入的 Token 序列不完整。 */
  missingEofToken: 'GML Parser 收到的 Token 序列缺少 EOF',
  /** 普通 Error：EOF 提前出现或重复，表示调用方提供了无效 Token 序列。 */
  invalidTokenSequence: 'GML Token 序列必须仅在末尾包含一个 EOF',
  /** UNSUPPORTED_TAG：Renderer 未找到标签组件；仅警告，仍渲染该标签的子节点。 */
  unsupportedTag: (tagName) => `发现未注册标签: ${tagName}`,
} satisfies GmlMessages
