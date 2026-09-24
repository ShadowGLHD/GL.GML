/**
 * 渲染层公共出口。
 * 外部模块从该文件导入组件、注册表类型和辅助函数，不需要依赖内部目录结构。
 */
export { default as GmlRenderer } from './GmlRenderer.vue'
export { defaultGmlRegistry } from './registry'
export { collectTags, flatten, getParams, getProps } from './renderer'
export type { GmlRegistry, GmlDebug, GmlParams } from './types'
