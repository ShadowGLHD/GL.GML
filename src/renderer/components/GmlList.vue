<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ ordered?: string | boolean }>()
const orderedList = computed(() => props.ordered === true || props.ordered === 'true')
</script>

<!-- GML <list> 的默认组件：ordered=true 使用 ol，否则使用 ul。 -->
<template>
  <component :is="orderedList ? 'ol' : 'ul'" class="gml-list"><slot /></component>
</template>

<style scoped>
.gml-list {
  max-width: 740px;
  margin: 14px 0;
  padding-left: 28px;
  color: var(--color-text-secondary);
  white-space: normal;
}
</style>
