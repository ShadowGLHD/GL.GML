<script setup lang="ts">
import { computed, ref } from 'vue'
import { GmlSyntaxError, parseGml } from '../src'
import { GmlRenderer, type GmlDebug } from '../src/vue'
import '../src/renderer/theme.css'

/** Playground 示例由 GML 源码和对应的页面参数组成. */
interface PlaygroundExample {
  name: string
  source: string
  parameters: Record<string, unknown>
}

/** 示例代码 */
const examples: PlaygroundExample[] = [
  {
    name: '基础标签',
    source: `<title>GML Playground</title>
<paragraph>你好, {{ user_name }}. 这里是 <strong>GL.GML</strong> 的实时预览.</paragraph>
<link href="https://github.com/">查看 GitHub</link>`,
    parameters: { user: { name: '开发者' } },
  },
  {
    name: '嵌套内容',
    source: `<section name="rendering">
  <heading level="2">渲染流水线</heading>
  <list ordered="true">
    <item>Tokenizer 将源码转换为 Token</item>
    <item>Parser 将 Token 转换为 AST</item>
    <item>Renderer 将 AST 映射为 Vue 组件</item>
  </list>
</section>`,
    parameters: {},
  },
  {
    name: '动态属性与代码',
    source: `<image :source="imageUrl" alt="示例图片" caption="动态属性直接读取参数" />
<code language="typescript">
const answer = 40 + 2
</code>`,
    parameters: { imageUrl: '/missing-image.webp' },
  },
  {
    name: '未知标签',
    source: `<FuturePanel>
  <paragraph>未注册的外层标签会透明渲染 children.</paragraph>
</FuturePanel>`,
    parameters: {},
  },
]

// 当前编辑状态. 切换示例时会同时替换 GML 和参数 JSON.
const selectedExample = ref(0)
const source = ref(examples[0].source)
const parametersInput = ref(JSON.stringify(examples[0].parameters, null, 2))
const showAst = ref(false)
const debugInfo = ref<GmlDebug[]>([])
const repositoryUrl = import.meta.env.VITE_REPOSITORY_URL || 'https://github.com/'

// AST 仅供 Playground 检查解析结果, 不参与 GmlRenderer 的实际渲染流程
const parsed = computed(() => {
  try {
    return { document: parseGml(source.value), error: null }
  } catch (error) {
    return {
      document: null,
      error: error instanceof GmlSyntaxError ? error : new Error('Unexpected parser failure'),
    }
  }
})

// 参数编辑器数据处理
const parametersState = computed(() => {
  try {
    const value: unknown = JSON.parse(parametersInput.value)
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { value: {}, error: '参数必须是 JSON 对象' }
    }
    return { value: value as Record<string, unknown>, error: null }
  } catch {
    return { value: {}, error: '参数 JSON 格式无效.' }
  }
})

// 工具栏统一展示当前最优先的解析错误或参数错误
const currentError = computed(() =>
  debugInfo.value.find((item) => item.level === 'error')?.message ?? parametersState.value.error,
)

const warnings = computed(() => debugInfo.value.filter((item) => item.level === 'warning'))

/** 接收渲染器统一返回的解析错误和未知标签信息. */
function handleDebug(info: GmlDebug[]): void {
  debugInfo.value = info
}

/** 加载指定示例, 同步更新源码和参数输入框. */
function loadExample(index: number): void {
  const example = examples[index]
  if (!example) return
  selectedExample.value = index
  source.value = example.source
  parametersInput.value = JSON.stringify(example.parameters, null, 2)
}

/** 恢复当前选中示例的初始内容. */
function resetExample(): void {
  loadExample(selectedExample.value)
}
</script>

<template>
  <main class="playground-shell">
    <!-- 页面标题和仓库入口. -->
    <header class="topbar">
      <div>
        <h1>GML Renderer Lab</h1>
        <p class="intro">编辑 GML, 观察 Tokenizer, Parser 与 Vue Renderer 的实时结果.</p>
      </div>
      <a :href="repositoryUrl" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
    </header>

    <!-- 示例切换, 内容重置和当前解析状态. -->
    <section class="toolbar" aria-label="Playground controls">
      <label>
        示例
        <select
          :value="selectedExample"
          @change="loadExample(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="(example, index) in examples" :key="example.name" :value="index">
            {{ example.name }}
          </option>
        </select>
      </label>
      <button type="button" @click="resetExample">重置当前示例</button>
      <span class="status" :class="{ 'status-error': currentError }">
        {{ currentError ? 'NEEDS ATTENTION' : 'PARSED / RENDERED' }}
      </span>
    </section>

    <section class="workspace">
      <!-- 左侧输入区: GML 源码和传给渲染器的页面参数 -->
      <div class="input-stack">
        <article class="panel editor-panel">
          <div class="panel-heading">
            <div>
              <span class="panel-kicker">01 / GML</span>
              <h2>GML</h2>
            </div>
            <span class="panel-meta">{{ source.length }} chars</span>
          </div>
          <textarea v-model="source" spellcheck="false" aria-label="GML input" />
        </article>

        <article class="panel parameters-panel">
          <div class="panel-heading">
            <div>
              <span class="panel-kicker">02 / PARAMETERS</span>
              <h2>页面参数 JSON</h2>
            </div>
            <span v-if="parametersState.error" class="panel-error" role="alert">
              {{ parametersState.error }}
            </span>
          </div>
          <textarea v-model="parametersInput" spellcheck="false" aria-label="Page parameters" />
        </article>
      </div>

      <!-- 右侧输出区: 在 AST 数据和真实组件渲染结果之间切换 -->
      <article class="panel preview-panel">
        <div class="panel-heading">
          <div>
            <span class="panel-kicker">03 / OUTPUT</span>
            <h2>实时渲染</h2>
          </div>
          <button type="button" class="switch-button" @click="showAst = !showAst">
            {{ showAst ? '查看预览' : '查看 AST' }}
          </button>
        </div>

        <!-- AST 面板只用于 Playground 调试, 由页面单独解析源码. -->
        <div v-if="showAst" class="ast-view">
          <pre v-if="parsed.document">{{ JSON.stringify(parsed.document, null, 2) }}</pre>
          <p v-else class="empty-state">解析失败, 暂无 AST.</p>
        </div>

        <!-- 实际渲染始终将源码交给 GmlRenderer, 由组件内部完成解析. -->
        <div v-else class="preview-canvas">
          <GmlRenderer
            :gml="source"
            :params="parametersState.value"
            @debug="handleDebug"
          />
        </div>

        <!-- 未知标签不会阻断渲染, 这里只提供可选的开发诊断信息. -->
        <aside v-if="warnings.length > 0" class="unsupported-box" role="status">
          <strong>WARNINGS ({{ warnings.length }})</strong>
          <span>
            <template v-for="warning in warnings" :key="`${warning.code}:${warning.message}`">
              {{ warning.message }}
            </template>
          </span>
        </aside>

        <!-- GML 解析错误属于源码和输出流程, 因此保留在右侧结果区. -->
        <div v-if="debugInfo.some((item) => item.level === 'error')" class="error-box" role="alert">
          <strong>GML ERROR</strong>
          <span>
            <template v-for="error in debugInfo.filter((item) => item.level === 'error')" :key="`${error.code}:${error.message}`">
              {{ error.message }}
            </template>
          </span>
        </div>
      </article>
    </section>

    <!-- 项目归属和许可证信息. -->
    <footer>
      <span>Project-local Core and Renderer</span>
      <span>MIT · Copyright © ShadowGLHD</span>
    </footer>
  </main>
</template>
