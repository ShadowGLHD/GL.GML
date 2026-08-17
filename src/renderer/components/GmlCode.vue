<script setup lang="ts">
/** language 只作为代码类型元数据；语法高亮可以在未来组件中基于它扩展。 */
defineProps<{
  language?: string
}>()
</script>

<!-- GML <code> 的默认组件：pre/code 组合原样显示 Parser 产生的 CodeNode。 -->
<template>
  <div class="gml-code">
    <div class="gml-code__head">
      <span>CODE</span>
      <span>{{ language || 'plain' }}</span>
    </div>
    <pre><code :data-language="language"><slot /></code></pre>
  </div>
</template>

<style scoped>
.gml-code {
  width: min(820px, 100%);
  margin: 22px 0;
  background: var(--ark-code-surface);
  color: var(--ark-on-code);
  white-space: normal;
}

.gml-code__head {
  display: flex;
  justify-content: space-between;
  padding: 9px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--ark-on-code) 22%, transparent);
  color: color-mix(in srgb, var(--ark-on-code) 70%, transparent);
  font: 700 9px/1 var(--font-mono);
  text-transform: uppercase;
}

.gml-code pre {
  max-width: 100%;
  margin: 0;
  padding: 18px;
  overflow: auto;
}

.gml-code code {
  font: 13px/1.7 var(--font-mono);
  white-space: pre;
}
</style>
