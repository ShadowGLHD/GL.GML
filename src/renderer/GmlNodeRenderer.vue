<script setup lang="ts">
import { computed } from 'vue'
import type { GmlNode } from '../core'
import { resolveElementChildren, resolveElementProps, resolveParameterText } from './renderer'
import type { GmlComponentRegistry, GmlRenderParameters } from './types'

/**
 * 单节点递归渲染器。
 * 输入一个 AST 节点和组件注册表；元素节点会继续把 children 交给自身渲染。
 */
const props = defineProps<{
  node: GmlNode
  registry: GmlComponentRegistry
  parameters: GmlRenderParameters
}>()

const definition = computed(() => {
  if (props.node.type !== 'element') return undefined
  // 标签名大小写敏感，直接使用原始 name 查找，不做 toLowerCase。
  if (!Object.prototype.hasOwnProperty.call(props.registry, props.node.name)) return undefined
  return props.registry[props.node.name]
})

const componentProps = computed(() => {
  if (props.node.type !== 'element' || !definition.value) return {}
  return resolveElementProps(props.node, definition.value, props.parameters)
})

const parameterValue = computed(() => {
  if (props.node.type !== 'parameter') return ''
  return resolveParameterText(props.node, props.parameters)
})

const renderedChildren = computed(() => {
  if (props.node.type !== 'element') return []
  return resolveElementChildren(props.node)
})
</script>

<template>
  <!-- text 永远是最终字面文本，不再执行参数识别。 -->
  <template v-if="node.type === 'text'">{{ node.value }}</template>

  <!-- 只有 ParameterNode 会从页面参数表读取值。 -->
  <template v-else-if="node.type === 'parameter'">{{ parameterValue }}</template>

  <!-- CodeNode 是 code 元素的正文，不参与参数替换。 -->
  <template v-else-if="node.type === 'code'">{{ node.value }}</template>

  <!-- Parser 全局配置决定注释是否进入 AST；默认渲染器不显示注释。 -->
  <template v-else-if="node.type === 'comment'"></template>

  <!-- 已注册元素：创建对应 Vue 组件，并把子节点递归渲染到默认插槽。 -->
  <component
    :is="definition.component"
    v-else-if="node.type === 'element' && definition"
    v-bind="componentProps"
  >
    <GmlNodeRenderer
      v-for="(child, index) in renderedChildren"
      :key="`${child.range.start.offset}-${index}`"
      :node="child"
      :registry="registry"
      :parameters="parameters"
    />
  </component>

  <!-- 未注册元素：跳过外层标签但继续渲染 children，即“透明容器”策略。 -->
  <template v-else-if="node.type === 'element'">
    <GmlNodeRenderer
      v-for="(child, index) in renderedChildren"
      :key="`${child.range.start.offset}-${index}`"
      :node="child"
      :registry="registry"
      :parameters="parameters"
    />
  </template>
</template>
