<script setup lang="ts">
import { computed } from 'vue'

/** Link properties are validated before they reach the anchor element. */
const props = defineProps<{
  href?: string
  title?: string
  target?: string
}>()

const safeHref = computed(() => {
  const href = props.href?.trim() ?? ''
  // 允许常见网页协议、锚点和相对路径，其他协议降级为不可跳转的 #。
  if (/^(https?:\/\/|mailto:|#|\/|\.\.?\/)/.test(href)) return href
  return '#'
})

// 只开放 _blank，并在模板中自动补上 noopener noreferrer。
const safeTarget = computed(() => (props.target === '_blank' ? '_blank' : undefined))
</script>

<!-- GML <link> 的默认组件：显示递归渲染的 children，并安全映射为 HTML a。 -->
<template>
  <a
    class="gml-link"
    :href="safeHref"
    :title="title"
    :target="safeTarget"
    :rel="safeTarget ? 'noopener noreferrer' : undefined"
  >
    <slot />
  </a>
</template>

<style scoped>
.gml-link {
  color: var(--ark-state);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
