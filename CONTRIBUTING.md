# 维护模板仓库

本仓库维护"新项目复制时的初始版本", 不负责汇总各业务项目对渲染层的定制.

## 本地检查

```powershell
npm install
npm run check
```

`npm run check` 会依次执行 TypeScript 类型检查、Vitest 回归测试和 Playground 生产构建。

提交前还应运行 Playground, 验证复制入口, 类型, 样式和交互均可工作.

## 修改原则

- Core 变化必须保持错误位置准确, 并通过 Playground 验证有效输入和错误输入.
- AST 字段变化必须同步更新渲染层和语法文档.
- Renderer 新属性必须显式加入注册表白名单.
- 不在默认渲染器中使用 `v-html`, `eval` 或 `new Function`.
- 不引入特定业务项目的路径, Store, Router, 全局组件或私有 CSS 变量.
- 模板应保持可以直接复制, 不能依赖模板仓库之外的 GML.

## 版本

建议为稳定快照创建 Git 标签, 例如 `v0.1.0`. 模板可以继续演进, 但已经复制到业务项目
的代码不自动升级.
