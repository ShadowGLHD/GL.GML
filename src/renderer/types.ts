import type { Component } from 'vue'

/**
 * 一个 GML 标签在 Vue 渲染层中的定义。
 * Parser 不依赖该类型；只有渲染器需要知道标签和组件的对应关系。
 */
export interface GmlTagDefinition {
  /** 实际负责显示该标签的 Vue 组件。 */
  component: Component
  /** 允许从 GML 传入组件的属性白名单，未列出的属性会被丢弃。 */
  attributes?: readonly string[]
  /** 将属性转换成组件 Props；动态属性可能是对象、数组或布尔值等原始参数类型。 */
  transformAttributes?: (attributes: Readonly<Record<string, unknown>>) => Record<string, unknown>
}

/** key 是大小写敏感的 GML 标签名，value 是对应组件定义。 */
export type GmlComponentRegistry = Readonly<Record<string, GmlTagDefinition>>

/** 页面传给渲染器的扁平参数表；渲染器只按完整名称取值，不执行表达式。 */
export type GmlRenderParameters = Readonly<Record<string, unknown>>

export interface UnsupportedTagEntry {
  name: string
  count: number
}

export interface UnsupportedTagSummary {
  /** 所有不支持标签实例的总数，不是不同标签名的数量。 */
  total: number
  entries: UnsupportedTagEntry[]
}
