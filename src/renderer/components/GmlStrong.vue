<!-- GML <strong> 的默认组件：只负责语义化强调，children 由递归渲染器传入。 -->
<template>
  <strong class="gml-strong"><slot /></strong>
</template>

<style scoped>
.gml-strong {
  color: var(--color-text);
  font-weight: 800;
}
</style>
