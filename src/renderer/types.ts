import type { Component } from 'vue'

/** 组件注册表 */
export type GmlComponentRegistry = Readonly<Record<string, Component>>

/** 页面传给渲染器的参数表. 普通对象会由渲染器展开, 数组保持完整值. */
export type GmlRenderParameters = Readonly<Record<string, unknown>>
