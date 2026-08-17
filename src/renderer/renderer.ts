import { isGmlName } from '../core'
import type { DocumentNode, ElementNode, GmlNode, ParameterNode } from '../core'
import type {
  GmlComponentRegistry,
  GmlRenderParameters,
  GmlTagDefinition,
  UnsupportedTagSummary,
} from './types'

const TRIM_ATTRIBUTE = 'trim'

/**
 * 从 ElementNode 中提取允许的属性，并转换成 Vue 组件 Props。
 *
 * 这是 GML 文档和真实组件之间的安全边界：文档不能把任意属性直接扩散到 DOM。
 */
export function resolveElementProps(
  node: ElementNode,
  definition: GmlTagDefinition,
  parameters: GmlRenderParameters = {},
): Record<string, unknown> {
  const allowed = new Set(definition.attributes ?? [])
  const attributes: Record<string, unknown> = {}

  // AST 保留全部属性，但渲染时只复制当前组件明确声明支持的属性。
  for (const attribute of node.attributes) {
    // trim 是 GML 渲染指令，不向业务组件传递。
    if (attribute.type === 'attribute' && attribute.name === TRIM_ATTRIBUTE) continue
    if (!allowed.has(attribute.name)) continue

    // Parser 已把两种属性构造成不同节点，渲染层不再重新解析名称中的冒号。
    if (attribute.type === 'attribute') {
      attributes[attribute.name] = attribute.value
      continue
    }

    const parameter = resolveParameter(attribute.parameter, parameters)
    if (parameter.found) attributes[attribute.name] = parameter.value
  }

  return definition.transformAttributes?.(attributes) ?? attributes
}

/**
 * `trim` 指令只调整渲染用的边界 TextNode，不修改 Parser 返回的原始 AST。
 * 注释默认不可见，因此寻找首尾可见节点时跳过 CommentNode。
 */
export function resolveElementChildren(node: ElementNode): GmlNode[] {
  const enabled = node.attributes.some(
    (attribute) =>
      attribute.type === 'attribute' &&
      attribute.name === TRIM_ATTRIBUTE &&
      (attribute.value === true || attribute.value === 'true'),
  )
  if (!enabled || node.children.length === 0) return node.children

  const children = [...node.children]
  const first = children.findIndex((child) => child.type !== 'comment')
  let last = children.length - 1
  while (last >= 0 && children[last]?.type === 'comment') last -= 1

  trimTextNode(children, first, true, first === last)
  if (last !== first) trimTextNode(children, last, false, true)
  return children
}

function trimTextNode(
  children: GmlNode[],
  index: number,
  trimStart: boolean,
  trimEnd: boolean,
): void {
  const node = children[index]
  if (node?.type !== 'text') return

  let start = 0
  let end = node.value.length
  if (trimStart) {
    start = node.value.startsWith('\r\n')
      ? 2
      : node.value[0] === '\r' || node.value[0] === '\n'
        ? 1
        : 0
  }
  if (trimEnd && end > start) {
    if (end - start >= 2 && node.value.endsWith('\r\n')) end -= 2
    else if (node.value[end - 1] === '\r' || node.value[end - 1] === '\n') end -= 1
  }

  if (start > 0 || end < node.value.length) {
    children[index] = { ...node, value: node.value.slice(start, end) }
  }
}

/**
 * 解析 ParameterNode 的页面参数。
 * 普通 TextNode 永远不会进入这里，也不会被再次解释为参数语法。
 */
export function resolveParameterText(
  node: ParameterNode,
  parameters: GmlRenderParameters = {},
): string {
  const parameter = resolveParameter(node.name, parameters)
  if (!parameter.found) return ''

  const resolved = parameter.value
  if (resolved == null) return ''
  if (['string', 'number', 'boolean', 'bigint'].includes(typeof resolved)) return String(resolved)
  return ''
}

interface ParameterResolution {
  found: boolean
  value?: unknown
}

/** 精确读取页面提供的扁平参数，不访问嵌套路径，也不执行任何计算。 */
function resolveParameter(name: string, parameters: GmlRenderParameters): ParameterResolution {
  if (!isParameterName(name) || !Object.prototype.hasOwnProperty.call(parameters, name)) {
    return { found: false }
  }
  return { found: true, value: parameters[name] }
}

/** 参数名沿用 GML 黑名单规则；仍然只按完整名称取值，不执行表达式。 */
function isParameterName(name: string): boolean {
  return isGmlName(name)
}

/**
 * 在真正渲染前遍历整棵 AST，统计当前注册表不支持的标签。
 * 统计和渲染分开进行，避免组件渲染期间通过副作用修改计数。
 */
export function collectUnsupportedTags(
  document: DocumentNode,
  registry: GmlComponentRegistry,
): UnsupportedTagSummary {
  const counts = new Map<string, number>()

  for (const child of document.children) collectFromNode(child, registry, counts)

  const entries = Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  return {
    total: entries.reduce((total, entry) => total + entry.count, 0),
    entries,
  }
}

function collectFromNode(
  node: GmlNode,
  registry: GmlComponentRegistry,
  counts: Map<string, number>,
): void {
  // 文本、注释和原始代码没有标签名，不参与注册表检查。
  if (node.type !== 'element') return

  if (!Object.prototype.hasOwnProperty.call(registry, node.name)) {
    counts.set(node.name, (counts.get(node.name) ?? 0) + 1)
  }
  // 即使父标签不受支持，也继续进入 children，保证所有嵌套节点都能被统计。
  for (const child of node.children) collectFromNode(child, registry, counts)
}
