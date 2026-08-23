<script lang="ts">
import { defineComponent, h, type PropType, type VNodeChild } from 'vue'
import type { ElementNode, GmlNode } from '../core'
import { defaultGmlRegistry } from './registry'
import { flatten, getParameter, getProps } from './renderer'
import type { GmlComponentRegistry, GmlRenderParameters } from './types'

interface RenderState {
  registry: GmlComponentRegistry
  parameters: GmlRenderParameters
}

/** Traverse AST nodes directly and create Vue VNodes without recursive selector components. */
function renderNode(node: GmlNode, state: RenderState): VNodeChild {
  switch (node.type) {
    case 'document':
      return h(
        'div',
        { class: 'gml-renderer' },
        node.children.map((child) => renderNode(child, state)),
      )

    case 'text':
    case 'code':
      return node.value

    case 'parameter':
      return getParameter(node, state.parameters)

    case 'comment':
      return null

    case 'element':
      return renderElement(node, state)
  }
}

function renderElement(node: ElementNode, state: RenderState): VNodeChild {
  const renderChildren = () => node.children.map((child) => renderNode(child, state))

  // 未注册元素采用透明容器策略, 忽略外层标签并继续渲染 children.
  if (!Object.prototype.hasOwnProperty.call(state.registry, node.name)) return renderChildren()

  const component = state.registry[node.name]
  return h(
    component,
    {
      ...getProps(node, state.parameters),
      key: node.range.start.offset,
    },
    { default: renderChildren },
  )
}

export default defineComponent({
  name: 'GmlNodeSelector',
  props: {
    node: {
      type: Object as PropType<GmlNode>,
      required: true,
    },
    registry: {
      type: Object as PropType<GmlComponentRegistry>,
      default: () => ({}),
    },
    parameters: {
      type: Object as PropType<GmlRenderParameters>,
      default: () => ({}),
    },
  },
  setup(props) {
    return () => {
      // 每次组件更新只合并一次注册表并扁平化一次页面参数.
      const state: RenderState = {
        registry: {
          ...defaultGmlRegistry,
          ...props.registry,
        },
        parameters: flatten(props.parameters),
      }

      return renderNode(props.node, state)
    }
  },
})
</script>

<style scoped>
.gml-renderer {
  min-width: 0;
  color: var(--color-text);
  white-space: break-spaces;
}
</style>
