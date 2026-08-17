<!-- GML <title> 的默认组件：把默认插槽中的子节点显示为文档主标题。 -->
<template>
  <h1 class="gml-title"><slot /></h1>
</template>

<style scoped>
.gml-title {
  max-width: 780px;
  margin: 0 0 24px;
  font-family: var(--font-display);
  font-size: clamp(30px, 4vw, 44px);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: 0;
}
</style>
