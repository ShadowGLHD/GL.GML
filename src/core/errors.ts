import type { GmlErrorCode, SourcePosition } from './types'

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
    return this.raise(`标签${tagName}未闭合`, 'UNCLOSED_TAG', position)
  }

  /** 属性值字符串未闭合 */
  unclosedString(position: SourcePosition): never {
    return this.raise('属性值字符串未闭合', 'UNCLOSED_STRING', position)
  }

  /** 包含非法字符 */
  invalidName(position: SourcePosition, character: string): never {
    return this.raise(`存在非法字符：${JSON.stringify(character)}`, 'INVALID_NAME', position)
  }

  /** 属性值中不允许出现的字符 */
  unexpectedCharacter(position: SourcePosition, character: string): never {
    return this.raise(
      `属性值包含非法字符：${JSON.stringify(character)}`,
      'UNEXPECTED_CHARACTER',
      position,
    )
  }

  unexpectedToken(position: SourcePosition, tokenType: string): never {
    return this.raise(`无法处理的 Token：${tokenType}`, 'UNEXPECTED_TOKEN', position)
  }

  missOpenTag(position: SourcePosition): never {
    return this.raise('此处应为开始标签', 'UNEXPECTED_TOKEN', position)
  }

  missOpenTagName(position: SourcePosition): never {
    return this.raise('开始标签缺少标签名', 'UNEXPECTED_TOKEN', position)
  }

  missOpenTagEnd(position: SourcePosition, tagName: string): never {
    return this.raise(`标签 <${tagName}> 后缺少 >`, 'UNEXPECTED_TOKEN', position)
  }

  missCloseTagName(position: SourcePosition): never {
    return this.raise('结束标签缺少标签名', 'UNEXPECTED_TOKEN', position)
  }

  mismatchedTag(position: SourcePosition, expected: string, actual: string): never {
    return this.raise(
      `期望结束标签 </${expected}>，实际得到 </${actual}>`,
      'MISMATCHED_TAG',
      position,
    )
  }

  maxDepth(position: SourcePosition, maxDepth: number): never {
    return this.raise(`标签嵌套层数超过允许的最大值 ${maxDepth}`, 'MAX_NESTING_DEPTH', position)
  }

  missCloseTagEnd(position: SourcePosition, tagName: string): never {
    return this.raise(`结束标签 </${tagName}> 后缺少 >`, 'UNEXPECTED_TOKEN', position)
  }

  duplicateAttribute(position: SourcePosition, attributeName: string): never {
    return this.raise(`属性 ${attributeName} 重复声明`, 'DUPLICATE_ATTRIBUTE', position)
  }

  missAttributeEquals(position: SourcePosition, attributeName: string): never {
    return this.raise(`属性 ${attributeName} 后缺少 =`, 'UNEXPECTED_TOKEN', position)
  }

  unquotedAttribute(position: SourcePosition, attributeName: string): never {
    return this.raise(`属性 ${attributeName} 的值必须使用引号`, 'UNQUOTED_ATTRIBUTE', position)
  }

  missingEofToken(): never {
    throw new Error('GML Parser 收到的 Token 序列缺少 EOF')
  }

  invalidMaxDepth(value: unknown): never {
    throw new RangeError(`GML 最大嵌套层数必须是正整数，当前值：${String(value)}`)
  }

  private raise(message: string, code: GmlErrorCode, position: SourcePosition): never {
    throw new GmlSyntaxError(message, code, position)
  }
}

/** Tokenizer 与 Parser 共享同一个无状态异常管理器。 */
export const errorManager = Object.freeze(new GmlErrorManager())
