<script setup lang="ts">
import { computed } from 'vue'

/** 这些 Props 由 registry.ts 从 <image> 的属性白名单转换得到。 */
const props = defineProps<{
  source: string
  alt?: string
  caption?: string
  width?: number
  height?: number
}>()

const safeSource = computed(() => {
  const source = props.source.trim()
  // 只允许站内相对路径和 http(s)，阻止文档把任意协议传给真实 img。
  if (/^(https?:\/\/|\/|\.\.?\/)/.test(source)) return source
  return ''
})
</script>

<!-- GML <image /> 的默认组件：提供懒加载、尺寸约束、替代文本和可选说明。 -->
<template>
  <figure class="gml-image">
    <img
      v-if="safeSource"
      :src="safeSource"
      :alt="alt ?? ''"
      :width="width"
      :height="height"
      loading="lazy"
      decoding="async"
    />
    <div v-else class="gml-image__invalid" role="status">IMAGE SOURCE INVALID</div>
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
.gml-image {
  width: min(760px, 100%);
  margin: 22px 0;
  white-space: normal;
}

.gml-image img {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: 520px;
  border: 1px solid var(--ark-line);
  object-fit: contain;
}

.gml-image figcaption {
  padding: 9px 0;
  border-bottom: 1px solid var(--ark-line);
  color: var(--ark-muted);
  font: 600 11px/1.5 var(--font-mono);
}

.gml-image__invalid {
  display: grid;
  min-height: 120px;
  place-items: center;
  border: 1px solid var(--ark-line);
  color: var(--ark-muted);
  font: 700 11px/1 var(--font-mono);
}
</style>
