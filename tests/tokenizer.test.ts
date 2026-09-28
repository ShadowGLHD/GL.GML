import { describe, expect, it } from 'vitest'
import { GmlSyntaxError, tokenizeGml } from '../src'

/** 只关注词法语义的用例省略位置；位置契约由下方专门的范围断言覆盖。 */
const values = (source: string) => tokenizeGml(source).map(({ type, value }) => ({ type, value }))

describe('tokenizer text and parameters', () => {
  it('merges escaped text and invalid candidates while retaining source ranges', () => {
    const source = String.raw`a\<b\> {{bad.name}} \{{escaped}}`
    expect(tokenizeGml(source)).toEqual([
      {
        type: 'TEXT',
        value: 'a<b> {{bad.name}} {{escaped}}',
        range: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: source.length, line: 1, column: source.length + 1 },
        },
      },
      expect.objectContaining({ type: 'EOF' }),
    ])
  })

  it('keeps invalid candidates literal, including enclosed markup and escapes', () => {
    const source = String.raw`{{ <p/> \x }}{{}}`
    expect(values(source)).toEqual([
      { type: 'TEXT', value: source },
      { type: 'EOF', value: '' },
    ])
  })

  it('recognizes adjacent parameters and Unicode names', () => {
    expect(values('a{{ user_name }}{{用户}}z')).toEqual([
      { type: 'TEXT', value: 'a' },
      { type: 'PARAMETER', value: 'user_name' },
      { type: 'PARAMETER', value: '用户' },
      { type: 'TEXT', value: 'z' },
      { type: 'EOF', value: '' },
    ])
  })

  it('keeps scanning tags and escapes after unmatched braces', () => {
    expect(values(String.raw`{{<p/>\<`)).toEqual([
      { type: 'TEXT', value: '{{' },
      { type: 'OPEN_TAG', value: '<' },
      { type: 'NAME', value: 'p' },
      { type: 'SELF_CLOSE', value: '/>' },
      { type: 'TEXT', value: '<' },
      { type: 'EOF', value: '' },
    ])
  })

  it('handles a long unmatched prefix and a trailing backslash', () => {
    // 验证退化输入仍完整保留，不绑定机器相关的耗时阈值；计时交给 bench:core。
    const source = '{'.repeat(80_000) + '\\'
    expect(values(source)).toEqual([
      { type: 'TEXT', value: source },
      { type: 'EOF', value: '' },
    ])
  })

  it('does not retain state between successful or failed calls', () => {
    const first = tokenizeGml('body')
    const snapshot = structuredClone(first)
    expect(() => tokenizeGml('<p')).toThrow(GmlSyntaxError)
    expect(tokenizeGml('body')).toEqual(snapshot)
    expect(first).toEqual(snapshot)
    expect(tokenizeGml('')).toEqual([
      {
        type: 'EOF',
        value: '',
        range: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 0, line: 1, column: 1 },
        },
      },
    ])
  })
})

describe('tokenizer tags, raw code, and positions', () => {
  it('decodes quoted strings without interpreting parameters or markup', () => {
    const tokens = tokenizeGml(String.raw`<x a="a\"b\\c{{p}}<y>" b='it\'s'/>`)
    expect(tokens.filter((token) => token.type === 'STRING').map((token) => token.value)).toEqual([
      'a"b\\c{{p}}<y>',
      "it's",
    ])
  })

  it.each(['\n', '\r', '\r\n'])('skips exactly one opening newline %j', (newline) => {
    const source = `<p>${newline}${newline}😀</p>`
    const text = tokenizeGml(source).find((token) => token.type === 'TEXT')!
    expect(text).toMatchObject({
      value: newline + '😀',
      range: {
        start: { offset: 3 + newline.length, line: 2, column: 1 },
        end: { offset: 5 + 2 * newline.length, line: 3, column: 3 },
      },
    })
  })

  it('does not skip text after a self-closing or closing tag', () => {
    expect(
      tokenizeGml('<x/>\n<p></p>\n')
        .filter((token) => token.type === 'TEXT')
        .map((token) => token.value),
    ).toEqual(['\n', '\n'])
  })

  it.each(['</code>', '</code >', '</ code\r\n>'])('reuses tag tokens for %j', (closing) => {
    const body = '<p>{{ignored}}</p>\\path'
    const source = `<code>\n${body}${closing}`
    const tokens = tokenizeGml(source)
    expect(tokens.map((token) => token.type)).toEqual([
      'OPEN_TAG',
      'NAME',
      'END_TAG',
      'RAW_CODE',
      'CLOSE_TAG',
      'NAME',
      'END_TAG',
      'EOF',
    ])
    expect(tokens[3]).toMatchObject({
      value: body,
      range: {
        start: { offset: 7, line: 2, column: 1 },
        end: { offset: 7 + body.length, line: 2, column: body.length + 1 },
      },
    })
    expect(tokens[4].range.start.offset).toBe(source.indexOf(closing))
    expect(tokens[6].range.end.offset).toBe(source.length)
  })

  it.each([1, 2, 3, 4])('handles %i backslashes before a code terminator', (count) => {
    // 奇数时首个结束标签属于正文，必须额外提供真正结束标签；偶数时直接结束。
    const slashes = '\\'.repeat(count)
    const escaped = count % 2 === 1
    const source = '<code>' + slashes + '</code >' + (escaped ? 'tail</code>' : '')
    const raw = tokenizeGml(source).find((token) => token.type === 'RAW_CODE')!
    expect(raw.value).toBe(escaped ? '\\'.repeat(count - 1) + '</code >tail' : slashes)
  })

  it('does not mistake similar tag names for a code terminator', () => {
    const body = '</codes></Code></code attr="x">'
    expect(tokenizeGml('<code>' + body + '</code>')[3].value).toBe(body)
  })

  it('emits empty raw content and keeps uppercase Code as a normal element', () => {
    expect(tokenizeGml('<code></code>')[3]).toMatchObject({ type: 'RAW_CODE', value: '' })
    expect(values('<Code>{{p}}</Code>')).toContainEqual({ type: 'PARAMETER', value: 'p' })
  })

  it('refreshes parameter lookahead after comments, attributes, and raw content', () => {
    expect(
      tokenizeGml('{{a}}<x v="}}"/><!-- }} --><code>}}</code>{{b}}')
        .filter((token) => token.type === 'PARAMETER')
        .map((token) => token.value),
    ).toEqual(['a', 'b'])
  })

  it.each([
    ['<p', 'UNCLOSED_TAG'],
    ['<p ', 'UNCLOSED_TAG'],
    ['<p\r\n', 'UNCLOSED_TAG'],
    ['</p ', 'UNCLOSED_TAG'],
    ['<!--', 'UNCLOSED_COMMENT'],
    ['<code>', 'UNCLOSED_CODE'],
    ['<code>\n', 'UNCLOSED_CODE'],
    ['<code>x', 'UNCLOSED_CODE'],
    ['<code>\\</code>', 'UNCLOSED_CODE'],
  ])('reports the opening position for %j', (source, code) => {
    expect(() => tokenizeGml('\r\n' + source)).toThrowError(
      expect.objectContaining({ code, offset: 2, line: 2, column: 1 }),
    )
  })

  it('reports unterminated quotes and invalid characters at their own positions', () => {
    expect(() => tokenizeGml('<x a="abc\\')).toThrowError(
      expect.objectContaining({ code: 'UNCLOSED_STRING', offset: 5, line: 1, column: 6 }),
    )
    expect(() => tokenizeGml('<x @>')).toThrowError(
      expect.objectContaining({ code: 'INVALID_NAME', offset: 3 }),
    )
  })
})
