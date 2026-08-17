<script setup lang="ts">
/** name 来自 registry.ts 允许通过的同名 GML 属性。 */
defineProps<{
  name?: string
}>()
</script>

<!-- GML <section> 的默认组件：用语义化 section 包裹递归渲染后的 children。 -->
<template>
  <section class="gml-section" :data-section="name">
    <div v-if="name" class="gml-section__label">{{ name }}</div>
    <slot />
  </section>
</template>

<style scoped>
.gml-section {
  position: relative;
  margin: 28px 0;
  padding-top: 18px;
  border-top: 1px solid var(--ark-line);
}

.gml-section__label {
  margin-bottom: 16px;
  color: var(--ark-muted);
  font: 800 10px/1 var(--font-mono);
  text-transform: uppercase;
}
</style>
