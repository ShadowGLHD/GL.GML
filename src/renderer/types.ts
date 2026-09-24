import type { Component } from 'vue'
/** 组件注册表 */
export type GmlRegistry = Readonly<Record<string, Component>>

/** 页面渲染器参数表 */
export type GmlParams = Readonly<Record<string, unknown>>

/** GML 解析及渲染过程中提供给调用方的单条诊断信息 */
export interface GmlDebug {
  /** 当前诊断的严重级别 */
  level: 'warning' | 'error'

  /** 稳定结果代码, 例如 UNSUPPORTED_TAG 或 GML 错误码 */
  code: string

  /** 面向诊断界面的简短说明 */
  message: string

}
