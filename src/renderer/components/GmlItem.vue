<!-- GML <item> 的默认组件：通常作为 <list> 的子节点渲染成 HTML li。 -->
<template>
  <li class="gml-item"><slot /></li>
</template>

<style scoped>
.gml-item {
  padding: 4px 0 4px 5px;
  line-height: 1.7;
}

.gml-item::marker {
  color: var(--ark-state);
  font-family: var(--font-mono);
  font-weight: 800;
}
</style>
