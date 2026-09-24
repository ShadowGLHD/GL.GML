import type { DocumentNode, ElementNode, GmlNode, ParameterNode } from '../core'
import type { GmlRegistry, GmlParams } from './types'

/** 将嵌套普通对象展开为一级参数, 数组和其他值保持原样 */
export function flatten(parameters: GmlParams): GmlParams {
  const result: Record<string, unknown> = {}

  function visit(value: unknown, prefix: string): void {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
    ) {
      for (const [key, child] of Object.entries(value)) {
        visit(child, prefix ? `${prefix}_${key}` : key)
      }
      return
    }

    if (prefix) result[prefix] = value
  }

  visit(parameters, '')
  return result
}

/** 解析属性值 */
export function getProps(node: ElementNode, parameters: GmlParams = {}): Record<string, unknown> {
  const attributes: Record<string, unknown> = {}

  // 所有 AST 属性都传给组件, 由组件自行声明和处理 Props.
  for (const attribute of node.attributes) {
    if (attribute.type === 'attribute') {
      attributes[attribute.name] = attribute.value
      continue
    }

    if (hasParameter(attribute.parameter, parameters)) {
      attributes[attribute.name] = parameters[attribute.parameter]
    }
  }

  return attributes
}

/** 解析参数值 */
export function getParams(node: ParameterNode, parameters: GmlParams = {}): string {
  if (!hasParameter(node.name, parameters)) return ''

  const resolved = parameters[node.name]
  if (resolved == null) return ''
  switch (typeof resolved) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'bigint':
      return String(resolved)
    default:
      return ''
  }
}

/** 按完整参数名读取值, 不执行表达式或嵌套路径访问. */
function hasParameter(name: string, parameters: GmlParams): boolean {
  return Object.prototype.hasOwnProperty.call(parameters, name)
}

/**
 * 在真正渲染前遍历整棵 AST, 统计当前注册表不支持的标签
 */
export function collectTags(document: DocumentNode, registry: GmlRegistry): string[] {
  const tags = new Set<string>()

  for (const child of document.children) collectFromNode(child, registry, tags)

  return Array.from(tags).sort((a, b) => a.localeCompare(b))
}

function collectFromNode(node: GmlNode, registry: GmlRegistry, tags: Set<string>): void {
  // 文本、注释和原始代码没有标签名，不参与注册表检查。
  if (node.type !== 'element') return

  if (!Object.prototype.hasOwnProperty.call(registry, node.name)) {
    tags.add(node.name)
  }
  // 即使父标签不受支持，也继续进入 children，保证所有嵌套节点都能被统计。
  for (const child of node.children) collectFromNode(child, registry, tags)
}
