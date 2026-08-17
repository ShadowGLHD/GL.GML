import type {
  AttributeNode,
  CodeNode,
  CommentNode,
  DocumentNode,
  ElementNode,
  GmlNode,
  ParameterNode,
  SourcePosition,
  TextNode,
  Token,
  TokenType,
} from './types'
import { MAX_NESTING_DEPTH, PRESERVE_COMMENTS } from './constants'
import { errorManager } from './errors'

type MissingTokenHandler = (position: SourcePosition) => never

/**
 * 将Token 数组转换成树形 AST
 *
 * parseDocument()
 *   -> parseNode()
 *      -> parseElement()
 *         -> parseAttributes()
 *         -> parseNode() 解析子节点
 */
export class GmlParser {
  /** 当前将要读取的 Token 数组下标 */
  private tokenIndex = 0
  /** 当前正在解析的元素层数; 根元素为第 1 层 */
  private depth = 0
  constructor(private readonly tokens: Token[]) {}

  /** 文档解析入口, 持续解析顶层节点, 直到 EOF */
  parseDocument(): DocumentNode {
    const children: GmlNode[] = []

    while (!this.check('EOF')) {
      const node = this.parseNode()
      // PRESERVE_COMMENTS=false 时注释返回 null, 不加入 AST
      if (node) children.push(node)
    }

    return {
      type: 'document',
      children,
    }
  }

  /** 处理当前位置节点, 处理完成后游标停在下一个节点前 */
  private parseNode(): GmlNode | null {
    const token = this.peek()

    switch (token.type) {
      case 'OPEN_TAG':
        return this.parseElement()

      case 'TEXT': {
        this.advance()
        const node: TextNode = {
          type: 'text',
          value: token.value,
          range: token.range,
        }
        return node
      }

      case 'PARAMETER': {
        this.advance()
        const node: ParameterNode = {
          type: 'parameter',
          name: token.value,
          range: token.range,
        }
        return node
      }

      case 'RAW_CODE': {
        this.advance()
        const node: CodeNode = {
          type: 'code',
          value: token.value,
          range: token.range,
        }
        return node
      }

      case 'COMMENT': {
        this.advance()
        if (!PRESERVE_COMMENTS) return null

        const node: CommentNode = {
          type: 'comment',
          value: token.value,
          range: token.range,
        }
        return node
      }

      default:
        return errorManager.unexpectedToken(token.range.start, token.type)
    }
  }

  /**
   * 解析一个完整元素
   * 以 <section name="intro">正文</section> 为例, 依次消费：
   * OPEN_TAG -> NAME -> 属性 Token -> END_TAG -> 子节点 -> CLOSE_TAG -> NAME -> TAG_END
   */
  private parseElement(): ElementNode {
    if (this.depth >= MAX_NESTING_DEPTH) {
      errorManager.maxDepth(this.peek().range.start, MAX_NESTING_DEPTH)
    }

    this.depth += 1
    try {
      return this.parseElementContent()
    } finally {
      // 若解析过程中抛错, 则恢复深度
      this.depth -= 1
    }
  }

  private parseElementContent(): ElementNode {
    const openToken = this.consume('OPEN_TAG', (position) => errorManager.missOpenTag(position))
    const nameToken = this.consume('NAME', (position) => errorManager.missOpenTagName(position))
    // 持续解析属性，直到遇到 END_TAG 或 SELF_CLOSE
    const attributes = this.parseAttributes()

    // 处理自闭合标签
    if (this.check('SELF_CLOSE')) {
      const closeToken = this.advance()
      return {
        type: 'element',
        name: nameToken.value,
        attributes,
        children: [],
        range: { start: openToken.range.start, end: closeToken.range.end },
      }
    }

    this.consume('END_TAG', (position) => errorManager.missOpenTagEnd(position, nameToken.value))
    const children: GmlNode[] = []

    while (!this.check('CLOSE_TAG')) {
      // 到达 EOF 仍没有 </当前标签>, 说明当前元素未闭合
      if (this.check('EOF')) {
        errorManager.unclosedTag(nameToken.range.start, `<${nameToken.value}>`)
      }
      // 子标签递归解析
      const child = this.parseNode()
      if (child) children.push(child)
    }

    // 当前是 CLOSE_TAG, 先消费 `</`, 再读取结束标签
    this.advance()
    const closingName = this.consume('NAME', (position) => errorManager.missCloseTagName(position))

    if (closingName.value !== nameToken.value) {
      errorManager.mismatchedTag(closingName.range.start, nameToken.value, closingName.value)
    }

    const closeToken = this.consume('END_TAG', (position) =>
      errorManager.missCloseTagEnd(position, closingName.value),
    )

    return {
      type: 'element',
      name: nameToken.value,
      attributes,
      children,
      range: { start: openToken.range.start, end: closeToken.range.end },
    }
  }

  /** 解析标签属性 */
  private parseAttributes(): AttributeNode[] {
    const attributes: AttributeNode[] = []
    let names: Set<string> | undefined

    while (this.check('NAME') || this.check('COLON')) {
      const bindingToken = this.check('COLON') ? this.advance() : undefined
      const nameToken = this.advance()

      if (nameToken.type !== 'NAME') {
        errorManager.invalidName(nameToken.range.start, nameToken.value)
      }

      if (names?.has(nameToken.value)) {
        errorManager.duplicateAttribute(nameToken.range.start, nameToken.value)
      }

      if (!names) names = new Set<string>()
      names.add(nameToken.value)

      // 无值静态属性默认 true
      if (!this.check('EQUALS') && !bindingToken) {
        attributes.push({
          type: 'attribute',
          name: nameToken.value,
          value: true,
          range: nameToken.range,
        })
        continue
      }

      this.consume('EQUALS', (position) =>
        errorManager.missAttributeEquals(position, nameToken.value),
      )

      if (!this.check('STRING')) {
        errorManager.unquotedAttribute(this.peek().range.start, nameToken.value)
      }

      const valueToken = this.advance()
      const range = {
        start: bindingToken?.range.start ?? nameToken.range.start,
        end: valueToken.range.end,
      }

      if (bindingToken) {
        attributes.push({
          type: 'binding',
          name: nameToken.value,
          parameter: valueToken.value,
          range,
        })
      } else {
        attributes.push({
          type: 'attribute',
          name: nameToken.value,
          value: valueToken.value,
          range,
        })
      }
    }

    return attributes
  }

  /**
   * 强制读取指定类型的 Token
   * 成功时行为与 advance() 相同; 失败时调用对应的集中式错误方法
   */
  private consume(type: TokenType, err: MissingTokenHandler): Token {
    if (this.check(type)) return this.advance()
    return err(this.peek().range.start)
  }

  /** 只判断当前 Token 类型, 不移动游标 */
  private check(type: TokenType): boolean {
    return this.peek().type === type
  }

  /** 返回当前 Token, 并把游标移动到下一个 Token */
  private advance(): Token {
    const token = this.peek()
    if (token.type !== 'EOF') this.tokenIndex += 1
    return token
  }

  /** 只查看当前 Token, 不移动游标 */
  private peek(): Token {
    const token = this.tokens[this.tokenIndex]
    if (!token) return errorManager.missingEofToken()
    return token
  }
}

/**
 * 函数式入口, 普通文章解析使用 parseGml(source)
 */
export function parseGmlTokens(tokens: Token[]): DocumentNode {
  return new GmlParser(tokens).parseDocument()
}
