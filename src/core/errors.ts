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
  /** 语法错误：标签未闭合 */
  unclosedTag(position: SourcePosition, tagName: string): never {
    return this.raise(messages.unclosedTag(tagName), 'UNCLOSED_TAG', position)
  }

  /** 属性值字符串未闭合 */
  unclosedString(position: SourcePosition): never {
    return this.raise(messages.unclosedString, 'UNCLOSED_STRING', position)
  }

  /** 包含非法字符 */
  invalidName(position: SourcePosition, character: string): never {
    return this.raise(messages.invalidName(character), 'INVALID_NAME', position)
  }

  /** 属性值中不允许出现的字符 */
  unexpectedCharacter(position: SourcePosition, character: string): never {
    return this.raise(messages.unexpectedCharacter(character), 'UNEXPECTED_CHARACTER', position)
  }

  unexpectedToken(position: SourcePosition, tokenType: string): never {
    return this.raise(messages.unexpectedToken(tokenType), 'UNEXPECTED_TOKEN', position)
  }

  missOpenTag(position: SourcePosition): never {
    return this.raise(messages.missOpenTag, 'UNEXPECTED_TOKEN', position)
  }

  missOpenTagName(position: SourcePosition): never {
    return this.raise(messages.missOpenTagName, 'UNEXPECTED_TOKEN', position)
  }

  missOpenTagEnd(position: SourcePosition, tagName: string): never {
    return this.raise(messages.missOpenTagEnd(tagName), 'UNEXPECTED_TOKEN', position)
  }

  missCloseTagName(position: SourcePosition): never {
    return this.raise(messages.missCloseTagName, 'UNEXPECTED_TOKEN', position)
  }

  mismatchedTag(position: SourcePosition, expected: string, actual: string): never {
    return this.raise(messages.mismatchedTag(expected, actual), 'MISMATCHED_TAG', position)
  }

  maxDepth(position: SourcePosition, maxDepth: number): never {
    return this.raise(messages.maxDepth(maxDepth), 'MAX_NESTING_DEPTH', position)
  }

  missCloseTagEnd(position: SourcePosition, tagName: string): never {
    return this.raise(messages.missCloseTagEnd(tagName), 'UNEXPECTED_TOKEN', position)
  }

  duplicateAttribute(position: SourcePosition, attributeName: string): never {
    return this.raise(messages.duplicateAttribute(attributeName), 'DUPLICATE_ATTRIBUTE', position)
  }

  missAttributeEquals(position: SourcePosition, attributeName: string): never {
    return this.raise(messages.missAttributeEquals(attributeName), 'UNEXPECTED_TOKEN', position)
  }

  unquotedAttribute(position: SourcePosition, attributeName: string): never {
    return this.raise(messages.unquotedAttribute(attributeName), 'UNQUOTED_ATTRIBUTE', position)
  }

  missingEofToken(): never {
    throw new Error(messages.missingEofToken)
  }

  invalidMaxDepth(value: unknown): never {
    throw new RangeError(messages.invalidMaxDepth(value))
  }

  private raise(message: string, code: GmlErrorCode, position: SourcePosition): never {
    throw new GmlSyntaxError(message, code, position)
  }
}

/** Tokenizer 与 Parser 共享同一个无状态异常管理器。 */
export const errorManager = Object.freeze(new GmlErrorManager())
