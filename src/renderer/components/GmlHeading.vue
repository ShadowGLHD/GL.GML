<script setup lang="ts">
import { computed } from 'vue'

/** level 已由注册表转换成 number，这里仍设置默认值以便组件单独使用。 */
const props = withDefaults(
  defineProps<{
    level?: number
  }>(),
  { level: 2 },
)

// 将任意数字限制在 HTML 合法的 h1 到 h6 范围内。
const tag = computed(() => `h${Math.min(6, Math.max(1, Math.trunc(props.level)))}`)
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
