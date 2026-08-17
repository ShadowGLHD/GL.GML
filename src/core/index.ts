import type { DocumentNode } from './types'
import { parseGmlTokens } from './parser'
import { tokenizeGml } from './tokenizer'

/** 解析 GML 源码为 AST */
export function parseGml(source: string): DocumentNode {
  const tokens = tokenizeGml(source)
  return parseGmlTokens(tokens)
}

export * from './errors'
export * from './validate'
export * from './types'
export { GmlParser, parseGmlTokens } from './parser'
export { GmlTokenizer, tokenizeGml } from './tokenizer'
