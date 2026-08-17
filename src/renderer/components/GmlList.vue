<script setup lang="ts">
/** ordered 已由注册表从 GML 字符串 "true" 转换成 boolean。 */
defineProps<{
  ordered?: boolean
}>()
</script>

<!-- GML <list> 的默认组件：ordered=true 使用 ol，否则使用 ul。 -->
<template>
  <component :is="ordered ? 'ol' : 'ul'" class="gml-list"><slot /></component>
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
