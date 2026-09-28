import { expect, it } from 'vitest'
import { GmlSyntaxError, parseGmlTokens, tokenizeGml } from '../src'

it('keeps token positions valid and fails malformed generated input only with syntax errors', () => {
  // 固定种子使失败可复现；混合语法片段覆盖状态切换，不引入随机测试依赖。
  const fragments = [
    'text',
    '😀',
    '\r',
    '\n',
    '\r\n',
    '\\<',
    '\\\\',
    '{{p}}',
    '{{',
    '}}',
    '<x>',
    '</x>',
    '<x/>',
    '<code>',
    '</ code >',
    '<!--',
    '-->',
    '<',
    '>',
    ' a="v"',
    ' :a="p"',
    '"',
    "'",
    '\\',
    ' ',
  ]
  let seed = 73
  for (let sample = 0; sample < 500; sample += 1) {
    let source = ''
    for (let index = 0; index < 12; index += 1) {
      // 32 位线性同余序列，每次运行生成相同的片段组合，失败输入可直接复现。
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      source += fragments[seed % fragments.length]
    }

    let tokens
    try {
      tokens = tokenizeGml(source)
    } catch (error) {
      // 随机拼接允许语法无效，但不允许泄漏 TypeError 等内部实现异常。
      expect(error, source).toBeInstanceOf(GmlSyntaxError)
      continue
    }

    expect(
      tokens.filter((token) => token.type === 'EOF'),
      source,
    ).toHaveLength(1)
    expect(tokens.at(-1)?.range.end.offset, source).toBe(source.length)
    // Token 范围可以跳过语法规定省略的空白，但必须有序且不重叠。
    let previousEnd = 0
    for (const token of tokens) {
      expect(token.range.start.offset, source).toBeGreaterThanOrEqual(previousEnd)
      expect(token.range.end.offset, source).toBeGreaterThanOrEqual(token.range.start.offset)
      for (const position of [token.range.start, token.range.end]) {
        // 从源码前缀独立计算行列，避免用扫描器自身的位置算法验证自身。
        const lines = source.slice(0, position.offset).split(/\r\n|\r|\n/)
        expect(position, source).toMatchObject({
          line: lines.length,
          column: lines.at(-1)!.length + 1,
        })
      }
      previousEnd = token.range.end.offset
    }
    // 词法有效不代表语法有效：第二阶段仍只允许 AST 成功或明确的语法异常。
    try {
      parseGmlTokens(tokens)
    } catch (error) {
      expect(error, source).toBeInstanceOf(GmlSyntaxError)
    }
  }
})
