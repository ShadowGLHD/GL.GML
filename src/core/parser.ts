import type {
  AttributeNode,
  DocumentNode,
  ElementNode,
  GmlChildNode,
  SourcePosition,
  Token,
  TokenType,
} from './types'
import { MAX_NESTING_DEPTH, PRESERVE_COMMENTS } from './constants'
import { errorManager } from './errors'

/** 由调用处提供具体语法错误, never 表明缺失 Token 后不会继续解析 */
type MissingTokenHandler = (position: SourcePosition) => never
/** 子节点循环只需要父元素名称和起点, 供 EOF 时报告最内层未闭合元素 */
type ParentContext = { name: string; start: SourcePosition }

class GmlParser {
  /** 指向下一个未消费的 Token */
  private tokenIndex = 0

  constructor(private readonly tokens: readonly Token[]) {}

  /** 解析入口 */
  parse(): DocumentNode {
    // 正常输入只检查末尾, 仅在末尾不合法时扫描, 区分缺失 EOF 与 EOF 位置错误
    if (this.tokens[this.tokens.length - 1]?.type !== 'EOF') {
      if (this.tokens.some((token) => token.type === 'EOF')) errorManager.invalidTokenSequence()
      errorManager.missingEofToken()
    }
    return this.parseDocument()
  }

  /** 文档自身不占嵌套层数, 因此从 0 开始, 首层元素深度为 1 */
  private parseDocument(): DocumentNode {
    return { type: 'document', children: this.parseChildren(0) }
  }

  private parseChildren(depth: number, parent?: ParentContext): GmlChildNode[] {
    const children: GmlChildNode[] = []
    while (!this.check('EOF')) {
      // 不消费 CLOSE_TAG, 由父元素核对名称
      if (parent && this.check('CLOSE_TAG')) return children
      const node = this.parseNode(depth)
      if (node) children.push(node)
    }
    if (parent) errorManager.unclosedTag(parent.start, '<' + parent.name + '>')
    return children
  }

  /** 解析单个节点 */
  private parseNode(depth: number): GmlChildNode | null {
    const token = this.peek()
    switch (token.type) {
      case 'OPEN_TAG':
        return this.parseElement(depth + 1)
      case 'TEXT':
        this.advance()
        return { type: 'text', value: token.value, range: token.range }
      case 'PARAMETER':
        this.advance()
        return { type: 'parameter', name: token.value, range: token.range }
      case 'RAW_CODE':
        this.advance()
        return { type: 'code', value: token.value, range: token.range }
      case 'COMMENT':
        this.advance()
        return PRESERVE_COMMENTS
          ? { type: 'comment', value: token.value, range: token.range }
          : null
      default:
        return errorManager.unexpectedToken(token.range.start, token.type)
    }
  }

  /** 从 OPEN_TAG 读取完整元素 */
  private parseElement(depth: number): ElementNode {
    const open = this.advance()
    // 在解析属性或进入子节点前限制深度, 自闭合元素同样占一层
    if (depth > MAX_NESTING_DEPTH) errorManager.maxDepth(open.range.start, MAX_NESTING_DEPTH)
    const name = this.consume('NAME', (position) => errorManager.missOpenTagName(position)).value
    const attributes = this.parseAttributes()
    let children: GmlChildNode[] = []
    let end: Token

    if (this.check('SELF_CLOSE')) {
      end = this.advance()
    } else {
      this.consume('END_TAG', (position) => errorManager.missOpenTagEnd(position, name))
      children = this.parseChildren(depth, { name, start: open.range.start })
      this.advance()
      const closeName = this.consume('NAME', (position) => errorManager.missCloseTagName(position))
      if (closeName.value !== name) {
        errorManager.mismatchedTag(closeName.range.start, name, closeName.value)
      }
      end = this.consume('END_TAG', (position) =>
        errorManager.missCloseTagEnd(position, closeName.value),
      )
    }

    return {
      type: 'element',
      name,
      attributes,
      children,
      range: { start: open.range.start, end: end.range.end },
    }
  }

  /** 每个元素独立记录已用属性名, 静态属性和动态绑定共用同一重名检查 */
  private parseAttributes(): AttributeNode[] {
    const attributes: AttributeNode[] = []
    const names = new Set<string>()
    while (this.check('NAME') || this.check('COLON')) {
      const binding = this.check('COLON') ? this.advance() : undefined
      const name = this.consume('NAME', (position) =>
        errorManager.invalidName(position, this.peek().value),
      )
      if (names.has(name.value)) errorManager.duplicateAttribute(name.range.start, name.value)
      names.add(name.value)
      if (!binding && !this.check('EQUALS')) {
        attributes.push({ type: 'attribute', name: name.value, value: true, range: name.range })
        continue
      }
      this.consume('EQUALS', (position) => errorManager.missAttributeEquals(position, name.value))
      const value = this.consume('STRING', (position) =>
        errorManager.unquotedAttribute(position, name.value),
      )
      const range = { start: binding?.range.start ?? name.range.start, end: value.range.end }
      if (binding) {
        attributes.push({ type: 'binding', name: name.value, parameter: value.value.trim(), range })
      } else {
        attributes.push({ type: 'attribute', name: name.value, value: value.value, range })
      }
    }
    return attributes
  }

  /** 仅在类型匹配时推进, 否则在当前 Token 起点抛出调用处提供的具体诊断 */
  private consume(type: TokenType, onMissing: MissingTokenHandler): Token {
    if (this.check(type)) return this.advance()
    return onMissing(this.peek().range.start)
  }

  /** 非消费式类型检查 */
  private check(type: TokenType): boolean {
    return this.peek().type === type
  }

  /** 返回当前 Token 后推进, EOF 作为哨兵保留, 避免错误处理越过数组末尾 */
  private advance(): Token {
    const token = this.peek()
    if (token.type !== 'EOF') this.tokenIndex += 1
    return token
  }

  /** 入口保证末尾 EOF, 读取时拒绝提前终止, 避免重复 EOF 导致后续 Token 被忽略 */
  private peek(): Token {
    const token = this.tokens[this.tokenIndex]
    if (token.type === 'EOF' && this.tokenIndex !== this.tokens.length - 1) {
      errorManager.invalidTokenSequence()
    }
    return token
  }
}

export function parseGmlTokens(tokens: readonly Token[]): DocumentNode {
  return new GmlParser(tokens).parse()  
}
