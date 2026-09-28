import type { DocumentNode } from './types'
import { parseGmlTokens } from './parser'
import { tokenizeGml } from './tokenizer'

/**
 * 源码解析的常用入口：先完成词法扫描，再将完整 Token 序列转换为 AST。
 * 任一阶段失败都直接抛出异常，不返回部分 AST；每次调用的内部状态互不共享。
 */
export function parseGml(source: string): DocumentNode {
  const tokens = tokenizeGml(source)
  return parseGmlTokens(tokens)
}

// 对外暴露函数、数据类型和可捕获的异常；有状态的实现类及异常工厂留在内部。
export { GmlSyntaxError } from './errors'
export * from './types'
export { parseGmlTokens } from './parser'
export { tokenizeGml } from './tokenizer'
