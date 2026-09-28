import { describe, expect, it } from 'vitest'
import { tokenizeGml } from '../src/core'

describe('GML character rules', () => {
  it('recognizes Unicode whitespace and excludes nearby ordinary characters', () => {
    for (const character of [' ', '\t', '\r', '\n', '\u00a0', '\u2000', '\u2028', '\ufeff']) {
      expect(
        tokenizeGml(`<x${character}a/>`)
          .filter((token) => token.type === 'NAME')
          .map((token) => token.value),
      ).toEqual(['x', 'a'])
      expect(tokenizeGml(`{{a${character}b}}`)[0].type).toBe('TEXT')
    }
    for (const character of ['', 'a', '中', '\u180e', '\u200b']) {
      expect(tokenizeGml(`<x${character}a/>`)[1].value).toBe(`x${character}a`)
    }
  })

  it('rejects control characters even when they are not whitespace', () => {
    // 覆盖 C0、DEL、C1 边界，并确认相邻的普通字符没有被一并排除。
    for (const character of ['\u0000', '\u001f', '\u007f', '\u0085', '\u009f']) {
      expect(() => tokenizeGml(`<x${character}/>`)).toThrow()
      expect(tokenizeGml(`{{a${character}b}}`)[0].type).toBe('TEXT')
    }
    for (const character of ['\u00a1', 'a', '-', '_']) {
      expect(tokenizeGml(`<${character}/>`)[1].value).toBe(character)
    }
  })

  it('preserves Unicode names and rejects whitespace, controls and reserved punctuation', () => {
    for (const name of ['中文名称', 'user_name', 'data-id', '123', '𠮷😀']) {
      expect(tokenizeGml(`{{${name}}}`)[0]).toMatchObject({ type: 'PARAMETER', value: name })
      expect(() => tokenizeGml(`<x :data="${name}"/>`)).not.toThrow()
    }
    for (const name of ['', 'a b', 'a\u00a0b', 'a\u0085b', 'user.name', 'a:b', '{{name}}']) {
      expect(tokenizeGml(`{{${name}}}`)[0].type).toBe('TEXT')
      expect(() => tokenizeGml(`<x :data="${name}"/>`)).toThrowError(
        expect.objectContaining({ code: 'INVALID_PARAMETER' }),
      )
    }
  })
})
