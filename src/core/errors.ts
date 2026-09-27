import type { GmlErrorCode, SourcePosition } from './types'
import { messages } from '../locales'

/**
 * 所有可预期的 GML 语法错误都使用该类型。
 * Tokenizer 和 Parser 共享它，所以调用者只需捕获一种异常。
 */
export class GmlSyntaxError extends SyntaxError {
  readonly code: GmlErrorCode
  readonly offset: number
  readonly line: number
  readonly column: number

  constructor(message: string, code: GmlErrorCode, position: SourcePosition) {
    // 把行列号放进 message，直接打印异常时也能得到可用信息。
    super(`${message} (${position.line}:${position.column})`)
    this.name = 'GmlSyntaxError'
    this.code = code
    this.offset = position.offset
    this.line = position.line
    this.column = position.column
  }
}

/** GML 全局异常管理器 */
class GmlErrorManager {
  /** UNCLOSED_TAG：元素、代码块或注释未闭合；tagName 为已格式化的显示名称。 */
  unclosedTag(position: SourcePosition, tagName: string): never {
    return this.raise(messages.unclosedTag(tagName), 'UNCLOSED_TAG', position)
  }

  /** UNCLOSED_STRING：属性值缺少结束引号；position 指向起始引号。 */
  unclosedString(position: SourcePosition): never {
    return this.raise(messages.unclosedString, 'UNCLOSED_STRING', position)
  }

  /** INVALID_NAME：名称含非法字符；position 指向该字符。 */
  invalidName(position: SourcePosition, character: string): never {
    return this.raise(messages.invalidName(character), 'INVALID_NAME', position)
  }

  /** UNEXPECTED_CHARACTER：报告属性值内的非法字符，文案由语言包负责转义。 */
  unexpectedCharacter(position: SourcePosition, character: string): never {
    return this.raise(messages.unexpectedCharacter(character), 'UNEXPECTED_CHARACTER', position)
  }

  /** UNEXPECTED_TOKEN：节点解析遇到无法处理的 Token 类型。 */
  unexpectedToken(position: SourcePosition, tokenType: string): never {
    return this.raise(messages.unexpectedToken(tokenType), 'UNEXPECTED_TOKEN', position)
  }

  /** UNEXPECTED_TOKEN：元素解析入口未读到 OPEN_TAG（<）。 */
  missOpenTag(position: SourcePosition): never {
    return this.raise(messages.missOpenTag, 'UNEXPECTED_TOKEN', position)
  }

  /** UNEXPECTED_TOKEN：OPEN_TAG 后未读到标签名称。 */
  missOpenTagName(position: SourcePosition): never {
    return this.raise(messages.missOpenTagName, 'UNEXPECTED_TOKEN', position)
  }

  /** UNEXPECTED_TOKEN：开始标签的属性结束后缺少 >；tagName 不含尖括号。 */
  missOpenTagEnd(position: SourcePosition, tagName: string): never {
    return this.raise(messages.missOpenTagEnd(tagName), 'UNEXPECTED_TOKEN', position)
  }

  /** UNEXPECTED_TOKEN：CLOSE_TAG（</）后未读到标签名称。 */
  missCloseTagName(position: SourcePosition): never {
    return this.raise(messages.missCloseTagName, 'UNEXPECTED_TOKEN', position)
  }

  /** MISMATCHED_TAG：结束标签名称与当前元素不符；position 指向实际结束标签的名称。 */
  mismatchedTag(position: SourcePosition, expected: string, actual: string): never {
    return this.raise(messages.mismatchedTag(expected, actual), 'MISMATCHED_TAG', position)
  }

  /** MAX_NESTING_DEPTH：进入下一层元素将超过上限；position 指向该元素的 <。 */
  maxDepth(position: SourcePosition, maxDepth: number): never {
    return this.raise(messages.maxDepth(maxDepth), 'MAX_NESTING_DEPTH', position)
  }

  /** UNEXPECTED_TOKEN：结束标签名称后缺少 >；tagName 不含尖括号。 */
  missCloseTagEnd(position: SourcePosition, tagName: string): never {
    return this.raise(messages.missCloseTagEnd(tagName), 'UNEXPECTED_TOKEN', position)
  }

  /** DUPLICATE_ATTRIBUTE：同一元素的静态属性或动态绑定重名；position 指向重复名称。 */
  duplicateAttribute(position: SourcePosition, attributeName: string): never {
    return this.raise(messages.duplicateAttribute(attributeName), 'DUPLICATE_ATTRIBUTE', position)
  }

  /** UNEXPECTED_TOKEN：需要赋值的属性缺少 =；无值静态属性不属于此错误。 */
  missAttributeEquals(position: SourcePosition, attributeName: string): never {
    return this.raise(messages.missAttributeEquals(attributeName), 'UNEXPECTED_TOKEN', position)
  }

  /** UNQUOTED_ATTRIBUTE：= 后未读到 STRING Token；position 指向实际读到的 Token。 */
  unquotedAttribute(position: SourcePosition, attributeName: string): never {
    return this.raise(messages.unquotedAttribute(attributeName), 'UNQUOTED_ATTRIBUTE', position)
  }

  /** Token 序列不完整，属于 Parser 调用契约错误，抛出普通 Error 而非语法异常。 */
  missingEofToken(): never {
    throw new Error(messages.missingEofToken)
  }

  /** 最大深度配置校验失败时使用；抛出 RangeError，并保留原始配置值的文字表示。 */
  invalidMaxDepth(value: unknown): never {
    throw new RangeError(messages.invalidMaxDepth(value))
  }

  /** 统一抛出语法异常：消息已由语言包生成，错误码及源码位置保持语言无关。 */
  private raise(message: string, code: GmlErrorCode, position: SourcePosition): never {
    throw new GmlSyntaxError(message, code, position)
  }
}

/** Tokenizer 与 Parser 共享同一个无状态异常管理器。 */
export const errorManager = Object.freeze(new GmlErrorManager())
