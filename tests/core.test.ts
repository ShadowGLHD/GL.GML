import { describe, expect, it } from 'vitest'
import { GmlSyntaxError, parseGml, tokenizeGml } from '../src'

describe('GML core', () => {
  it('parses nested elements, attributes, and parameters', () => {
    const document = parseGml(
      '<section name="main">\n<paragraph>Hello {{ user_name }}</paragraph>\n</section>',
    )

    expect(document.type).toBe('document')
    expect(document.children).toHaveLength(1)
    expect(document.children[0]).toMatchObject({
      type: 'element',
      name: 'section',
      attributes: [{ type: 'attribute', name: 'name', value: 'main' }],
    })

    const section = document.children[0]
    if (section.type !== 'element') throw new Error('expected section element')
    const paragraph = section.children[0]
    if (paragraph.type !== 'element') throw new Error('expected paragraph element')
    expect(paragraph.children.map((node) => node.type)).toEqual(['text', 'parameter'])
  })

  it('skips one newline after every non-self-closing opening tag', () => {
    const document = parseGml('<paragraph>\nbody\n</paragraph>')
    const paragraph = document.children[0]

    expect(paragraph.type).toBe('element')
    if (paragraph.type !== 'element') return
    expect(paragraph.children).toEqual([
      expect.objectContaining({ type: 'text', value: 'body\n' }),
    ])
  })

  it('keeps comments lexically isolated from markup', () => {
    const tokens = tokenizeGml('<!-- <unknown /> --><paragraph>ok</paragraph>')
    expect(tokens.map((token) => token.type)).toEqual([
      'COMMENT',
      'OPEN_TAG',
      'NAME',
      'END_TAG',
      'TEXT',
      'CLOSE_TAG',
      'NAME',
      'END_TAG',
      'EOF',
    ])
  })

  it('reports stable syntax error metadata', () => {
    expect(() => parseGml('<paragraph>')).toThrowError(GmlSyntaxError)

    try {
      parseGml('<paragraph>')
    } catch (error) {
      expect(error).toMatchObject({ code: 'UNCLOSED_TAG', line: 1, column: 2 })
    }
  })
})
