<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    level?: number | string
  }>(),
  { level: '2' },
)

const tag = computed(() => {
  const level = Number(props.level)
  return `h${Math.min(6, Math.max(1, Number.isFinite(level) ? Math.trunc(level) : 2))}`
})
</script>

<!-- GML <heading level="N"> 的默认组件：根据 level 动态选择 HTML 标题元素。 -->
<template>
  <component :is="tag" class="gml-heading"><slot /></component>
</template>

<style scoped>
.gml-heading {
  margin: 24px 0 12px;
  font-family: var(--font-display);
  font-size: 23px;
  font-weight: 850;
  line-height: 1.25;
  letter-spacing: 0;
}
</style>
