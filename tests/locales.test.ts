import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { messages as chinese } from '../src/locales/zh-CN'
import { messages as english } from '../src/locales/en-US'

describe.each([
  {
    language: 'zh-CN',
    messages: chinese,
    mismatch: '期望结束标签 </paragraph>，实际得到 </section> (1:15)',
    unclosedString: '属性值字符串未闭合 (2:6)',
    missingEof: 'GML Parser 收到的 Token 序列缺少 EOF',
    invalidDepth: 'GML 最大嵌套层数必须是正整数，当前值：-1',
    invalidCharacter: '存在非法字符："\\n"',
    unsupportedTag: '发现未注册标签: FuturePanel',
  },
  {
    language: 'en-US',
    messages: english,
    mismatch: 'Expected closing tag </paragraph>, but got </section> (1:15)',
    unclosedString: 'Unclosed attribute value string (2:6)',
    missingEof: 'The token sequence received by the GML parser is missing EOF',
    invalidDepth: 'The maximum GML nesting depth must be a positive integer; received: -1',
    invalidCharacter: 'Invalid character: "\\n"',
    unsupportedTag: 'Unregistered tag found: FuturePanel',
  },
])('$language diagnostics', (locale) => {
  beforeEach(() => {
    // 模拟开发者切换固定导出，不为生产代码增加运行时语言配置。
    vi.resetModules()
    vi.doMock('../src/locales', () => ({ messages: locale.messages }))
  })

  afterEach(() => {
    vi.doUnmock('../src/locales')
    vi.resetModules()
  })

  it('localizes parser errors while preserving their type, code, and source position', async () => {
    const { parseGml, GmlSyntaxError } = await import('../src')
    let caught: unknown
    try {
      parseGml('<paragraph>A</section>')
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(GmlSyntaxError)
    expect(caught).toMatchObject({
      name: 'GmlSyntaxError',
      code: 'MISMATCHED_TAG',
      message: locale.mismatch,
      offset: 14,
      line: 1,
      column: 15,
    })
  })

  it('localizes tokenizer errors without losing multiline positions', async () => {
    const { tokenizeGml, GmlSyntaxError } = await import('../src')
    let caught: unknown
    try {
      tokenizeGml('\n<p a="')
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(GmlSyntaxError)
    expect(caught).toMatchObject({
      code: 'UNCLOSED_STRING',
      message: locale.unclosedString,
      offset: 6,
      line: 2,
      column: 6,
    })
  })

  it('preserves ordinary Error and RangeError diagnostics', async () => {
    const { parseGmlTokens, errorManager } = await import('../src')
    expect(() => parseGmlTokens([])).toThrowError(new Error(locale.missingEof))
    expect(() => errorManager.invalidMaxDepth(-1)).toThrowError(new RangeError(locale.invalidDepth))
  })

  it('formats control characters and unregistered tag names', () => {
    expect(locale.messages.invalidName('\n')).toBe(locale.invalidCharacter)
    expect(locale.messages.unsupportedTag('FuturePanel')).toBe(locale.unsupportedTag)
  })
})
