<script setup lang="ts">
import { computed } from 'vue'
import type { DocumentNode } from '../core'
import GmlNodeRenderer from './GmlNodeRenderer.vue'
import { defaultGmlRegistry } from './registry'
import { collectUnsupportedTags } from './renderer'
import type { GmlComponentRegistry, GmlRenderParameters } from './types'

/**
 * 文档级渲染器。
 * 它合并注册表、启动顶层递归渲染，并统一显示不支持标签汇总。
 */
const props = withDefaults(
  defineProps<{
    document: DocumentNode
    registry?: GmlComponentRegistry
    parameters?: GmlRenderParameters
    showUnsupportedNotice?: boolean
  }>(),
  {
    registry: () => ({}),
    parameters: () => ({}),
    showUnsupportedNotice: true,
  },
)

const activeRegistry = computed<GmlComponentRegistry>(() => ({
  // 后展开的自定义注册表覆盖同名默认定义，例如用项目图片组件替换 image。
  ...defaultGmlRegistry,
  ...props.registry,
}))

// 统计只依赖 AST 和注册表；任一方变化时 Vue 会自动重新计算。
const unsupported = computed(() => collectUnsupportedTags(props.document, activeRegistry.value))
</script>

<template>
  <div class="gml-renderer">
    <!-- GML 支持多个根节点，因此逐个交给单节点递归渲染器。 -->
    <GmlNodeRenderer
      v-for="(node, index) in document.children"
      :key="`${node.range.start.offset}-${index}`"
      :node="node"
      :registry="activeRegistry"
      :parameters="parameters"
    />

    <!-- 汇总放在文档末尾；不支持标签的 children 已在正文中透明渲染。 -->
    <aside
      v-if="showUnsupportedNotice && unsupported.total > 0"
      class="gml-unsupported"
      role="status"
    >
      <span class="gml-unsupported__count">{{ unsupported.total }}</span>
      <div>
        <strong>UNSUPPORTED TAGS</strong>
        <p>
          当前渲染器不支持
          <template v-for="(entry, index) in unsupported.entries" :key="entry.name">
            <code>{{ entry.name }}</code> × {{ entry.count
            }}<template v-if="index < unsupported.entries.length - 1">、</template>
          </template>
        </p>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.gml-renderer {
  min-width: 0;
  color: var(--color-text);
  white-space: break-spaces;
}

.gml-unsupported {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  margin-top: 32px;
  padding: 14px 0;
  border-top: 1px solid var(--ark-ink);
  border-bottom: 1px solid var(--ark-line);
  white-space: normal;
}

.gml-unsupported__count {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  background: var(--ark-signal);
  color: var(--ark-ink);
  font: 900 22px/1 var(--font-mono);
}

.gml-unsupported strong {
  display: block;
  margin-bottom: 5px;
  font: 800 10px/1 var(--font-mono);
}

.gml-unsupported p {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.gml-unsupported code {
  color: var(--color-text);
  font-family: var(--font-mono);
  font-weight: 700;
}
</style>
