<script lang="ts">
import { computed, defineComponent, h, watch, type PropType, type VNodeChild } from 'vue'
import {
  GmlSyntaxError,
  parseGml,
  type DocumentNode,
  type ElementNode,
  type GmlNode,
} from '../core'
import { defaultGmlRegistry } from './registry'
import { collectTags, flatten, getParams, getProps } from './renderer'
import type { GmlRegistry, GmlDebug, GmlParams, GmlTheme } from './types'

/** 内部解析状态; 解析失败时不会保留不完整的 AST */
type ParseState = {
  document?: DocumentNode
  error?: GmlSyntaxError
}

/**
 * 一次渲染过程中所有节点共享的上下文
 *
 * 将注册表和参数集中到同一个对象中传递，可以避免递归遍历 AST 时不断合并注册表或
 * 扁平化参数，这里的数据只在当前渲染调用中使用，不承担跨渲染缓存的职责
 */
interface RenderState {
  /** 已合并内置组件和调用方自定义组件的最终标签注册表 */
  registry: GmlRegistry

  /** 已展开为下划线键名的参数表, 供正文参数和动态属性按完整名称读取 */
  params: GmlParams

  /** 应用到渲染器根节点的主题名称 */
  theme: GmlTheme
}

/** 解析 GML AST 节点为可以渲染的子节点 */
function renderNode(node: GmlNode, state: RenderState): VNodeChild {
  switch (node.type) {
    case 'document':
      // 文档节点是渲染入口。统一的根元素便于外部布局，并承载本组件的作用域样式。
      return h(
        'div',
        { class: 'gml-renderer', 'data-theme': state.theme },
        node.children.map((child) => renderNode(child, state)),
      )

    case 'text':
    case 'code':
      return node.value

    case 'parameter':
      return getParams(node, state.params)

    case 'comment':
      // 注释保留在 AST 中供分析工具使用，但不会生成可见 DOM
      return null

    case 'element':
      // 元素节点结合注册表处理
      return renderElement(node, state)
  }
}

/** 根据标签查找对应组件, 并递归渲染子节点 */
function renderElement(node: ElementNode, state: RenderState): VNodeChild {
  // 使用函数插槽延迟创建 children, 符合 Vue 组件 VNode 的插槽调用约定
  const renderChildren = () => node.children.map((child) => renderNode(child, state))

  // 使用 hasOwnProperty 避免标签名意外命中注册表原型链上的属性
  if (!Object.prototype.hasOwnProperty.call(state.registry, node.name)) return renderChildren()

  const component = state.registry[node.name]
  return h(
    component,
    {
      // 静态属性和动态绑定统一转换为目标组件的 props; 具体校验由目标组件负责
      ...getProps(node, state.params),

      // 源码起始偏移在同一份 AST 中稳定且唯一，可帮助 Vue 正确复用同级组件节点
      key: node.range.start.offset,
    },
    // GML 子节点通过默认插槽交给目标组件决定最终布局
    { default: renderChildren },
  )
}

/** GML 渲染入口 */
export default defineComponent({
  name: 'GmlRenderer',
  /** 返回所有错误和警告; 无诊断时发送空数组 */
  emits: { debug: (_info: GmlDebug[]): boolean => true },
  props: {
    /** 待渲染的 GML 文档源码 */
    gml: {
      type: String,
      default: '',
    },

    /** 内置 light、dark, 也可使用调用方通过 CSS 定义的主题名称 */
    theme: {
      type: String as PropType<GmlTheme>,
      default: 'light',
    },

    /** 组件注册表 */
    registry: {
      type: Object as PropType<GmlRegistry>,
      default: () => ({}),
    },

    /** 数据源 */
    params: {
      type: Object as PropType<GmlParams>,
      default: () => ({}),
    },
  },
  setup(props, { emit }) {
    // 每次注册表变化时生成最终映射
    const registry = computed<GmlRegistry>(() => ({ ...defaultGmlRegistry, ...props.registry }))

    // 源码变化时重新解析; 预期的 GML 语法错误转为状态, 其他程序异常仍然向外抛出
    const parsed = computed<ParseState>(() => {
      try {
        return { document: parseGml(props.gml) }
      } catch (error) {
        if (error instanceof GmlSyntaxError) return { error }
        throw error
      }
    })

    // 调试信息由同一次解析结果产生, 避免调用方为了错误或未知标签再次解析 GML
    const debug = computed<GmlDebug[]>(() => {
      if (parsed.value.error) {
        return [
          {
            level: 'error',
            code: parsed.value.error.code,
            message: parsed.value.error.message,
          },
        ]
      }

      const document = parsed.value.document
      if (!document) return []

      return collectTags(document, registry.value).map((tag) => ({
        level: 'warning',
        code: 'UNSUPPORTED_TAG',
        message: `发现未注册标签: ${tag}`,
      }))
    })

    // 源码或注册表变化后统一通知调用方
    watch(debug, (info) => emit('debug', info), { immediate: true })

    // 返回渲染函数, 使 AST 可以直接递归转换为 VNode, 而不需要中间模板结构
    return () => {
      // 解析失败时不创建正文 DOM, 具体错误可由调用方通过 debug 事件展示
      const document = parsed.value.document
      if (!document) return null

      // 在渲染函数内构造状态, 确保响应式 props 更新后能使用最新的注册表和参数
      const state: RenderState = {
        registry: registry.value,
        // flatten 只展开普通对象; 数组及其他值会作为完整参数保留
        params: flatten(props.params),
        theme: props.theme,
      }

      return renderNode(document, state)
    }
  },
})
</script>

<style scoped>
.gml-renderer {
  /* 允许渲染器作为 flex/grid 子项时收缩, 避免长内容撑破父级布局 */
  min-width: 0;
  background: var(--color-background);
  color: var(--color-text);
  /* 保留 GML 文本中的换行和连续空格, 同时仍允许在需要时自动换行 */
  white-space: break-spaces;
}
</style>
