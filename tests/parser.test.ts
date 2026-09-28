import { describe, expect, it, vi } from 'vitest'
import { GmlSyntaxError, parseGml, parseGmlTokens, tokenizeGml, type ElementNode } from '../src'

/** 通过真实解析入口取得首个元素，供属性和范围断言复用；不手工伪造 AST。 */
function element(source: string): ElementNode {
  const node = parseGml(source).children[0]
  if (node.type !== 'element') throw new Error('Expected an element')
  return node
}

describe('parser structure and attributes', () => {
  it('parses multiple roots, literal text, and self-closing elements', () => {
    expect(parseGml('a<x/><p>b<y/>c</p>d').children.map((node) => node.type)).toEqual([
      'text',
      'element',
      'element',
      'text',
    ])
    expect(element('<p>b<y/>c</p>').children.map((node) => node.type)).toEqual([
      'text',
      'element',
      'text',
    ])
    expect(parseGml('<!-- comment -->').children).toEqual([])
  })

  it('normalizes binding names and retains full attribute ranges', () => {
    const source = '<x enabled a="" :data=" 用户_name "/>'
    const node = element(source)
    expect(node.attributes).toMatchObject([
      { type: 'attribute', name: 'enabled', value: true },
      { type: 'attribute', name: 'a', value: '' },
      { type: 'binding', name: 'data', parameter: '用户_name' },
    ])
    const binding = node.attributes[2]
    expect(source.slice(binding.range.start.offset, binding.range.end.offset)).toBe(
      ':data=" 用户_name "',
    )
    expect(node.range).toEqual({
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: source.length, line: 1, column: source.length + 1 },
    })
  })

  it.each(['', ' ', 'user.name', 'a b', 'fn()', 'a+b'])('rejects binding name %j', (name) => {
    expect(() => parseGml(`<x :data="${name}"/>`)).toThrowError(
      expect.objectContaining({ code: 'INVALID_PARAMETER', offset: 9 }),
    )
  })

  it.each(['<x a a/>', '<x a="1" a="2"/>', '<x a :a="p"/>', '<x :a="p" a/>', '<x :a="p" :a="q"/>'])(
    'rejects duplicate attributes: %s',
    (source) => {
      expect(() => parseGml(source)).toThrowError(
        expect.objectContaining({ code: 'DUPLICATE_ATTRIBUTE' }),
      )
    },
  )

  it.each([
    ['<x a=1/>', 'UNQUOTED_ATTRIBUTE'],
    ['<x :a/>', 'UNEXPECTED_TOKEN'],
    ['<x :/>', 'INVALID_NAME'],
    ['<>', 'UNEXPECTED_TOKEN'],
    ['</x>', 'UNEXPECTED_TOKEN'],
    ['<x></>', 'UNEXPECTED_TOKEN'],
    ['<x></y>', 'MISMATCHED_TAG'],
    ['<x></x/>', 'UNEXPECTED_TOKEN'],
    ['<x></x a>', 'UNEXPECTED_TOKEN'],
    ['<x "value"/>', 'UNEXPECTED_TOKEN'],
  ])('rejects malformed grammar: %s', (source, code) => {
    expect(() => parseGml(source)).toThrowError(expect.objectContaining({ code }))
  })

  it('reports the innermost unclosed element at its opening delimiter', () => {
    expect(() => parseGml('<outer>\n<inner>text')).toThrowError(
      expect.objectContaining({ code: 'UNCLOSED_TAG', offset: 8, line: 2, column: 1 }),
    )
  })

  it('accepts 32 levels, rejects 33, and does not accumulate depth across siblings or calls', () => {
    const nested = (depth: number) => '<x>'.repeat(depth) + '</x>'.repeat(depth)
    expect(() => parseGml(nested(32) + nested(32))).not.toThrow()
    expect(() => parseGml(nested(33))).toThrowError(
      expect.objectContaining({ code: 'MAX_NESTING_DEPTH', offset: 96 }),
    )
    expect(() => parseGml('<x>'.repeat(32) + '<y/>' + '</x>'.repeat(32))).toThrowError(
      expect.objectContaining({ code: 'MAX_NESTING_DEPTH' }),
    )
    expect(() => parseGml(nested(32))).not.toThrow()
  })

  it('retains comments at every level when comment preservation is enabled', async () => {
    // 常量在模块加载时绑定，先清缓存再替换配置，验证同一实现的另一条注释分支。
    vi.resetModules()
    vi.doMock('../src/core/constants', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/core/constants')>()),
      PRESERVE_COMMENTS: true,
    }))
    try {
      const { parseGml: parseWithComments } = await import('../src/core')
      expect(parseWithComments('<!--a--><x><!--b--></x>')).toMatchObject({
        children: [
          { type: 'comment', value: 'a' },
          { type: 'element', children: [{ type: 'comment', value: 'b' }] },
        ],
      })
    } finally {
      // 无论断言是否成功都恢复模块状态，避免把保留注释的配置带到其他用例。
      vi.doUnmock('../src/core/constants')
      vi.resetModules()
    }
  })
})

describe('public token parser contract', () => {
  it.each([1, 4])('rejects an EOF inside an element at token %i', (index) => {
    // 分别在标签名称前和子节点后插入 EOF，确保递归解析和 consume 都不会提前结束。
    const tokens = tokenizeGml('<p>x</p>')
    tokens.splice(index, 0, tokenizeGml('')[0])
    expect(() => parseGmlTokens(tokens)).toThrow(Error)
    expect(() => parseGmlTokens(tokens)).not.toThrow(GmlSyntaxError)
  })

  it('can parse the same readonly token sequence repeatedly without mutations', () => {
    const source = '<p a="v">{{name}}<x/></p>'
    // 冻结数组和 Token 检测直接写入，再用快照检查嵌套范围等数据是否被修改。
    const tokens = Object.freeze(tokenizeGml(source).map((token) => Object.freeze(token)))
    const before = structuredClone(tokens)
    expect(parseGmlTokens(tokens)).toEqual(parseGml(source))
    expect(parseGmlTokens(tokens)).toEqual(parseGml(source))
    expect(tokens).toEqual(before)
  })

  it.each(
    [
      [],
      tokenizeGml('x').slice(0, -1),
      [...tokenizeGml('a'), ...tokenizeGml('b')],
      [...tokenizeGml(''), ...tokenizeGml('')],
      [...tokenizeGml(''), tokenizeGml('x')[0]],
      // 包装为对象，防止参数化测试把 Token 数组展开成多个回调参数。
    ].map((tokens) => ({ tokens })),
  )('rejects incomplete or concatenated streams %#', ({ tokens }) => {
    expect(() => parseGmlTokens(tokens)).toThrow(Error)
    expect(() => parseGmlTokens(tokens)).not.toThrow(GmlSyntaxError)
  })
})
