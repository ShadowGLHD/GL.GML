import { TRIM_CODE_BOUNDARY_NEWLINES } from './constants'
import { errorManager } from './errors'
import { isGmlName, isGmlChar, isSpaceChar } from './validate'
import type { SourcePosition, Token, TokenType } from './types'

type TokenizerMode = 'text' | 'tag' | 'raw-code'
type TagStatus = 'opening' | 'closing'

export class GmlTokenizer {
  /** offset 用于截取源码, line/column 用于生成便于阅读的错误位置 */
  private offset = 0
  private line = 1 // 行
  private column = 1 // 列
  private mode: TokenizerMode = 'text'
  private tagStatus: TagStatus | null = null
  private tagName: string | null = null
  private readonly tokens: Token[] = []

  constructor(private readonly source: string) {}

  /** 持续扫描文档 */
  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      if (this.mode === 'raw-code') {
        this.CodeMode()
      } else if (this.mode === 'tag') {
        this.TagMode()
      } else {
        this.TextMode()
      }
    }

    if (this.mode !== 'text') {
      errorManager.unclosedTag(this.position(), '')
    }

    // 追加 EOF 供 Parser 判断结束
    const position = this.position()
    this.tokens.push(this.token('EOF', '', position, position))
    return this.tokens
  }

  private TextMode(): void {
    // 记录当前指针位置
    const start = this.position()

    // 检查顺序从最长、最具体的语法开始, 避免把 <!-- 或 </ 拆成普通 <
    if (this.startsWith('<!--')) {
      this.advance(4)
      const valueStart = this.offset
      const valueEnd = this.source.indexOf('-->', valueStart)
      if (valueEnd === -1) errorManager.unclosedTag(start, '<!-- ')
      const value = this.source.slice(valueStart, valueEnd)
      this.advance(valueEnd - this.offset + 3)
      this.tokens.push(this.token('COMMENT', value, start, this.position()))
    } else if (this.startsWith('</')) {
      this.advance(2)
      this.tokens.push(this.token('CLOSE_TAG', '</', start, this.position()))
      this.enterTag('closing')
    } else if (this.current() === '<') {
      this.advance()
      this.tokens.push(this.token('OPEN_TAG', '<', start, this.position()))
      this.enterTag('opening')
    } else if (this.isEscContent()) {
      // 出现转义字符时, 将其作为TEXT Token
      this.advance()
      const value = this.current()
      this.advance()
      this.pushText(value, start, this.position())
    } else if (this.isParameterStart()) {
      // 动态参数解析
      const valueStart = this.offset + 2
      const valueEnd = this.source.indexOf('}}', valueStart)
      this.advance(valueEnd - this.offset + 2)
      const rawName = this.source.slice(valueStart, valueEnd)
      const name = rawName.trim()
      if (isGmlName(name)) {
        // 合法 {{ name }} 生成参数 Token
        this.tokens.push(this.token('PARAMETER', name, start, this.position()))
      } else {
        // 非法候选直接作为普通文本
        this.pushText(`{{${rawName}}}`, start, this.position())
      }
    } else {
      const valueStart = this.offset
      while (
        !this.isAtEnd() &&
        this.current() !== '<' &&
        !this.isEscContent() &&
        !this.isParameterStart()
      ) {
        this.advance()
      }

      const value = this.source.slice(valueStart, this.offset)
      this.pushText(value, start, this.position())
    }
  }

  /** 在 Tokenizer 内合并相邻 TEXT */
  private pushText(value: string, start: SourcePosition, end: SourcePosition): void {
    if (value.length === 0) return

    const previous = this.tokens[this.tokens.length - 1]
    if (previous?.type === 'TEXT') {
      previous.value += value
      previous.range = { start: previous.range.start, end }
      return
    }

    this.tokens.push(this.token('TEXT', value, start, end))
  }

  private TagMode(): void {
    // 过滤标签内空格
    while (!this.isAtEnd() && isSpaceChar(this.current())) this.advance()

    const start = this.position()

    if (this.startsWith('/>')) {
      this.advance(2)
      this.tokens.push(this.token('SELF_CLOSE', '/>', start, this.position()))
      this.leaveTag(false)
    } else if (this.current() === '>') {
      this.advance()
      this.tokens.push(this.token('END_TAG', '>', start, this.position()))
      this.leaveTag(this.tagStatus === 'opening' && this.tagName === 'code')
    } else if (this.current() === '=') {
      this.advance()
      this.tokens.push(this.token('EQUALS', '=', start, this.position()))
    } else if (this.current() === '"' || this.current() === "'") {
      const quote = this.current() as '"' | "'"
      this.advance()
      const valueStart = this.offset
      let sliceStart = valueStart
      const parts: string[] = []

      while (!this.isAtEnd() && this.current() !== quote) {
        if (this.isEscContent()) {
          // 保存反斜杠之前的连续文本, 并直接写入之后字符
          parts.push(this.source.slice(sliceStart, this.offset), this.source[this.offset + 1] ?? '')
          this.advance(2)
          sliceStart = this.offset
        } else {
          this.advance()
        }
      }

      if (this.isAtEnd()) errorManager.unclosedString(start)

      const tail = this.source.slice(sliceStart, this.offset)
      let value = tail
      if (parts.length > 0) {
        parts.push(tail)
        value = parts.join('')
      }
      this.advance()
      this.tokens.push(this.token('STRING', value, start, this.position()))
    } else if (this.tagStatus === 'opening' && this.tagName !== null && this.current() === ':') {
      // 动态属性的冒号独立成 COLON
      this.advance()
      if (!isGmlChar(this.current())) errorManager.invalidName(this.position(), this.current())
      this.tokens.push(this.token('COLON', ':', start, this.position()))
    } else {
      if (!isGmlChar(this.current())) errorManager.invalidName(start, this.current())
      const valueStart = this.offset
      this.advance()

      while (!this.isAtEnd() && isGmlChar(this.current())) this.advance()

      const value = this.source.slice(valueStart, this.offset)
      const name = this.token('NAME', value, start, this.position())
      if (this.tagName === null) this.tagName = name.value
      this.tokens.push(name)
    }
  }

  /** 读取 <code> 的原始内容 */
  private CodeMode(): void {
    const codeStart = this.position()
    const valueStart = this.offset
    let cursor = valueStart
    let sliceStart = valueStart
    let codeEnd = -1
    const parts: string[] = []

    // 扫描</code>位置
    while (cursor < this.source.length) {
      if (this.source[cursor] === '\\' && cursor + 1 < this.source.length) {
        if (this.source.startsWith('</code>', cursor + 1)) {
          parts.push(this.source.slice(sliceStart, cursor))
          cursor += 1
          sliceStart = cursor
          cursor += '</code>'.length
        } else {
          cursor += 2
        }
        continue
      }

      if (this.source.startsWith('</code>', cursor)) {
        codeEnd = cursor
        break
      }

      cursor += 1
    }

    if (codeEnd === -1) return errorManager.unclosedTag(codeStart, '<code>')

    const tail = this.source.slice(sliceStart, codeEnd)
    let value = tail
    if (parts.length > 0) {
      parts.push(tail)
      value = parts.join('')
    }

    // 代码块围栏两侧的一个换行属于排版，不属于代码正文。
    if (TRIM_CODE_BOUNDARY_NEWLINES) {
      const trimStart = value.startsWith('\r\n')
        ? 2
        : value[0] === '\r' || value[0] === '\n'
          ? 1
          : 0
      let trimEnd = value.length

      if (trimEnd > trimStart) {
        if (trimEnd - trimStart >= 2 && value.endsWith('\r\n')) trimEnd -= 2
        else if (value[trimEnd - 1] === '\r' || value[trimEnd - 1] === '\n') trimEnd -= 1
      }

      if (trimStart > 0 || trimEnd < value.length) value = value.slice(trimStart, trimEnd)
    }

    // 手动补充 </code>的结束 Token
    this.advance(codeEnd - this.offset)
    this.tokens.push(this.token('RAW_CODE', value, codeStart, this.position()))

    const closeStart = this.position()
    this.advance(2)
    this.tokens.push(this.token('CLOSE_TAG', '</', closeStart, this.position()))

    const nameStart = this.position()
    this.advance(4)
    this.tokens.push(this.token('NAME', 'code', nameStart, this.position()))

    const endStart = this.position()
    this.advance()
    this.tokens.push(this.token('END_TAG', '>', endStart, this.position()))

    this.mode = 'text'
    this.tagStatus = null
    this.tagName = null
  }

  /** 进入标签 */
  private enterTag(kind: TagStatus): void {
    this.mode = 'tag'
    this.tagStatus = kind
    this.tagName = null
  }

  /** 离开标签
   * @param rawCode true 代码模式|false 文本模式
   */
  private leaveTag(rawCode: boolean): void {
    this.mode = rawCode ? 'raw-code' : 'text'
    this.tagStatus = null
    this.tagName = null
  }

  private token(type: TokenType, value: string, start: SourcePosition, end: SourcePosition): Token {
    return {
      type,
      value,
      range: { start, end },
    }
  }

  /** 返回当前源码位置 */
  private position(): SourcePosition {
    return { offset: this.offset, line: this.line, column: this.column }
  }

  /** 返回当前位置字符 */
  private current(): string {
    return this.source[this.offset] ?? ''
  }

  private startsWith(value: string): boolean {
    return this.source.startsWith(value, this.offset)
  }

  /** 判断是否需要读取参数 */
  private isParameterStart(): boolean {
    return this.startsWith('{{') && this.source.indexOf('}}', this.offset + 2) !== -1
  }

  /** 反斜杠只要还有后续字符, 就与该字符组成转义 */
  private isEscContent(): boolean {
    return this.current() === '\\' && this.offset + 1 < this.source.length
  }

  private isAtEnd(): boolean {
    return this.offset >= this.source.length
  }

  /** 更新当前位置, 并处理换行符 */
  private advance(count = 1): void {
    for (let index = 0; index < count && !this.isAtEnd(); index += 1) {
      const right = this.current()
      const left = this.source[this.offset - 1]
      this.offset += 1

      if (right === '\r') {
        this.line += 1
        this.column = 1
      } else if (right === '\n') {
        if (left !== '\r') this.line += 1
        this.column = 1
      } else {
        this.column += 1
      }
    }
  }
}

export function tokenizeGml(source: string): Token[] {
  // 函数式入口隐藏类实例, 普通调用者不需要管理 Tokenizer 状态
  return new GmlTokenizer(source).tokenize()
}
