<!-- GML <paragraph> 的默认组件：break-spaces 让 Parser 保留的换行和连续空格可见。 -->
<template>
  <p class="gml-paragraph"><slot /></p>
</template>

<style scoped>
.gml-paragraph {
  max-width: 760px;
  margin: 12px 0;
  color: var(--color-text-secondary);
  font-size: 15px;
  line-height: 1.85;
  white-space: break-spaces;
}
</style>
