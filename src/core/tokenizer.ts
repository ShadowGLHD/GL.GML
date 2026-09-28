import { errorManager } from './errors'
import { NAME_CHAR_BLACKLIST } from './constants'
import type { SourcePosition, Token, TokenType } from './types'

// 正则只表示词法规则, 不使用 g/y, 重复 test 不会改变匹配位置
const SPACE_CHARACTER = /^\s$/u
const NON_NAME_CHARACTER = /[\s\u0000-\u001f\u007f-\u009f]/u

/** 把同一标签的方向、起点和名称放在一起, 避免切换模式后遗失错误上下文 */
type TagState = {
  mode: 'tag'
  kind: 'opening' | 'closing'
  start: SourcePosition // 起始 < 的位置; 未闭合时据此定位
  name: string | null // 首个 NAME 是标签名; 后续 NAME 属于属性, 不覆盖此值
}

type ScannerState = { mode: 'text' } | TagState | { mode: 'raw-code'; openingStart: SourcePosition }

/** 每次函数调用独占扫描状态 */
class GmlTokenizer {
  /** 始终指向下一个未消费的 UTF-16 代码单元, 所有推进统一经过 advance */
  private offset = 0
  private line = 1
  private column = 1
  private state: ScannerState = { mode: 'text' }
  private readonly tokens: Token[] = []
  /** undefined 尚未搜索; -1 表示剩余源码没有参数闭合符 */
  private parameterEnd: number | undefined

  constructor(private readonly source: string) {}

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      switch (this.state.mode) {
        case 'text':
          this.scanText()
          break
        case 'tag':
          this.scanTag(this.state)
          break
        case 'raw-code':
          this.scanRawCode(this.state.openingStart)
          break
      }
    }
    // 只有成功结束扫描才输出 EOF, 未完成的模式用开始标签位置报告错误
    if (this.state.mode === 'tag') {
      const { start, kind, name } = this.state
      const displayName = name ? '<' + (kind === 'closing' ? '/' : '') + name + '>' : ''
      errorManager.unclosedTag(start, displayName)
    }
    if (this.state.mode === 'raw-code') errorManager.unclosedCode(this.state.openingStart)
    this.emit('EOF', '', this.position())
    return this.tokens
  }

  private scanText(): void {
    const start = this.position()
    // 优先识别较长分隔符, 避免把注释或结束标签当作普通开始标签
    if (this.startsWith('<!--')) {
      this.readComment()
    } else if (this.startsWith('</')) {
      this.advance(2)
      this.emit('CLOSE_TAG', '</', start)
      this.state = { mode: 'tag', kind: 'closing', start, name: null }
    } else if (this.current() === '<') {
      this.advance()
      this.emit('OPEN_TAG', '<', start)
      this.state = { mode: 'tag', kind: 'opening', start, name: null }
    } else {
      this.readText()
    }
  }

  /** 连续文本按片段收集, 遇到有效参数时先输出前置正文 */
  private readText(): void {
    const start = this.position()
    const parts: string[] = []
    let sliceStart = this.offset

    while (!this.isAtEnd() && this.current() !== '<') {
      if (this.isEscape()) {
        parts.push(this.source.slice(sliceStart, this.offset), this.source[this.offset + 1])
        this.advance(2)
        sliceStart = this.offset
      } else if (this.startsWith('{{')) {
        // -1 对剩余源码永久有效, 避免多个未闭合 {{ 反复扫描相同后缀
        if (
          this.parameterEnd === undefined ||
          (this.parameterEnd !== -1 && this.parameterEnd < this.offset + 2)
        ) {
          this.parameterEnd = this.source.indexOf('}}', this.offset + 2)
        }
        const end = this.parameterEnd
        if (end === -1) {
          this.advance()
          continue
        }
        const name = this.source.slice(this.offset + 2, end).trim()
        // 占位符名称按 Unicode 码点检查, 非法候选仍作为字面文本输出
        let validName = name.length > 0
        for (const character of name) {
          const code = character.charCodeAt(0)
          if (
            !((code >= 0x21 && code <= 0x7e) || !NON_NAME_CHARACTER.test(character)) ||
            NAME_CHAR_BLACKLIST.has(character)
          ) {
            validName = false
            break
          }
        }
        if (validName) {
          // 先结束正文, 再读取参数, 两类 Token 的源码范围不重叠
          parts.push(this.source.slice(sliceStart, this.offset))
          const parameterStart = this.position()
          this.emitText(parts.join(''), start)
          this.advance(end + 2 - this.offset)
          this.emit('PARAMETER', name, parameterStart)
          return
        }
        // 非法候选整体保留为字面文本, 不解析其中的标签或转义
        this.advance(end + 2 - this.offset)
      } else {
        this.advance()
      }
    }
    parts.push(this.source.slice(sliceStart, this.offset))
    this.emitText(parts.join(''), start)
  }

  /** 注释整体读取, 不解释内部标签和参数 */
  private readComment(): void {
    const start = this.position()
    const end = this.source.indexOf('-->', this.offset + 4)
    if (end === -1) errorManager.unclosedComment(start)
    const value = this.source.slice(this.offset + 4, end)
    this.advance(end + 3 - this.offset)
    this.emit('COMMENT', value, start)
  }

  private scanTag(state: TagState): void {
    // 标签空白不生成 Token, 但需要维护源码位置
    while (SPACE_CHARACTER.test(this.current())) this.advance()
    if (this.isAtEnd()) return
    const start = this.position()
    if (this.startsWith('/>')) {
      this.advance(2)
      this.emit('SELF_CLOSE', '/>', start)
      this.state = { mode: 'text' }
    } else if (this.current() === '>') {
      this.advance()
      this.emit('END_TAG', '>', start)
      if (state.kind === 'opening') {
        // 开始标签后仅省略一个换行, CRLF 作为整体消费
        if (this.startsWith('\r\n')) this.advance(2)
        else if (this.current() === '\r' || this.current() === '\n') this.advance()
      }
      this.state =
        state.kind === 'opening' && state.name === 'code'
          ? { mode: 'raw-code', openingStart: state.start }
          : { mode: 'text' }
    } else if (this.current() === '=') {
      this.advance()
      this.emit('EQUALS', '=', start)
    } else if (this.current() === ':') {
      this.advance()
      this.emit('COLON', ':', start)
    } else if (this.current() === '"' || this.current() === "'") {
      this.readQuotedString(state)
    } else {
      const name = this.readName()
      if (state.name === null) state.name = name
    }
  }

  /** 读取引号字符串并校验动态绑定值 */
  private readQuotedString(state: TagState): void {
    const start = this.position()
    // 属性字符串只在同种引号处结束, 转义字符消除下一字符的语法含义
    const quote = this.current()
    this.advance()
    let sliceStart = this.offset
    const parts: string[] = []
    while (!this.isAtEnd() && this.current() !== quote) {
      if (this.isEscape()) {
        parts.push(this.source.slice(sliceStart, this.offset), this.source[this.offset + 1])
        this.advance(2)
        sliceStart = this.offset
      } else {
        this.advance()
      }
    }
    if (this.isAtEnd()) errorManager.unclosedString(start)
    parts.push(this.source.slice(sliceStart, this.offset))
    this.advance()
    const value = parts.join('')
    // 标签内空白不产生 Token, 因此末尾 COLON NAME EQUALS 标识动态绑定
    const previous = this.tokens.length - 1
    if (
      state.kind === 'opening' &&
      this.tokens[previous]?.type === 'EQUALS' &&
      this.tokens[previous - 1]?.type === 'NAME' &&
      this.tokens[previous - 2]?.type === 'COLON'
    ) {
      const parameter = value.trim()
      let validName = parameter.length > 0
      for (const character of parameter) {
        const code = character.charCodeAt(0)
        if (
          !((code >= 0x21 && code <= 0x7e) || !NON_NAME_CHARACTER.test(character)) ||
          NAME_CHAR_BLACKLIST.has(character)
        ) {
          validName = false
          break
        }
      }
      if (!validName) errorManager.invalidParameter(start, value)
    }
    this.emit('STRING', value, start)
  }

  private readName(): string {
    const start = this.position()
    // 第一个 NAME 是标签名, 后续 NAME 是属性名, 不覆盖错误上下文
    while (!this.isAtEnd()) {
      const character = this.current()
      const code = character.charCodeAt(0)
      if (
        !((code >= 0x21 && code <= 0x7e) || !NON_NAME_CHARACTER.test(character)) ||
        NAME_CHAR_BLACKLIST.has(character)
      )
        break
      this.advance()
    }
    if (this.offset === start.offset) errorManager.invalidName(start, this.current())
    const name = this.source.slice(start.offset, this.offset)
    this.emit('NAME', name, start)
    return name
  }

  private scanRawCode(openingStart: SourcePosition): void {
    const start = this.position()
    let sliceStart = this.offset
    const parts: string[] = []
    while (!this.isAtEnd()) {
      if (this.isEscape()) {
        const escapedEnd = this.rawCodeCloseEnd(this.offset + 1)
        if (escapedEnd !== -1) {
          parts.push(this.source.slice(sliceStart, this.offset))
          this.advance() // 只转义结束标签
          sliceStart = this.offset
          this.advance(escapedEnd - this.offset)
        } else {
          // 其他反斜杠保持原样
          this.advance(2)
        }
      } else if (this.rawCodeCloseEnd(this.offset) !== -1) {
        parts.push(this.source.slice(sliceStart, this.offset))
        this.emit('RAW_CODE', parts.join(''), start)
        // 结束标签本身交给普通 text/tag 扫描流程
        this.state = { mode: 'text' }
        break
      } else {
        this.advance()
      }
    }
    if (this.state.mode === 'raw-code') errorManager.unclosedCode(openingStart)
  }

  /** 返回合法结束标签之后的位置, 失败返回 -1, 不改变主游标或行列号 */
  private rawCodeCloseEnd(offset: number): number {
    if (!this.source.startsWith('</', offset)) return -1
    let cursor = offset + 2
    while (SPACE_CHARACTER.test(this.source[cursor] ?? '')) cursor += 1
    if (!this.source.startsWith('code', cursor)) return -1
    cursor += 4
    while (SPACE_CHARACTER.test(this.source[cursor] ?? '')) cursor += 1
    return this.source[cursor] === '>' ? cursor + 1 : -1
  }

  /** 参数紧邻文本边界时不输出空 TEXT */
  private emitText(value: string, start: SourcePosition): void {
    if (value) this.emit('TEXT', value, start)
  }

  /** start 为读取前的快照, 当前游标为排他终点; value 解码后不一定与源码等长 */
  private emit(type: TokenType, value: string, start: SourcePosition): void {
    this.tokens.push({ type, value, range: { start, end: this.position() } })
  }

  /** 每次创建新对象, 使已输出的 Token 位置不受后续游标推进影响 */
  private position(): SourcePosition {
    return { offset: this.offset, line: this.line, column: this.column }
  }

  /** EOF 返回空字符串, 供空白和名称判断自然停止 */
  private current(): string {
    return this.source[this.offset] ?? ''
  }

  /** 从当前游标前瞻固定分隔符, 不消费源码 */
  private startsWith(value: string): boolean {
    return this.source.startsWith(value, this.offset)
  }

  /** 只有存在下一字符才形成转义, 正文末尾孤立的反斜杠保持为字面文本 */
  private isEscape(): boolean {
    return this.current() === '\\' && this.offset + 1 < this.source.length
  }

  /** 所有扫描循环共享的终止条件 */
  private isAtEnd(): boolean {
    return this.offset >= this.source.length
  }

  /** offset / column 按 UTF-16 代码单元计数, CRLF 算一次换行 */
  private advance(count = 1): void {
    const end = Math.min(this.offset + count, this.source.length)
    while (this.offset < end) {
      const character = this.source[this.offset]
      const previous = this.source[this.offset - 1]
      this.offset += 1
      if (character === '\r') {
        this.line += 1
        this.column = 1
      } else if (character === '\n') {
        // 即使 CR 和 LF 分两次 advance 消费, 也不能把 CRLF 算成两行
        if (previous !== '\r') this.line += 1
        this.column = 1
      } else {
        this.column += 1
      }
    }
  }
}

/** 每次调用创建独立扫描器, 成功结果包含唯一的末尾 EOF */
export function tokenizeGml(source: string): Token[] {
  return new GmlTokenizer(source).tokenize()
}
