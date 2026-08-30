# Task: 同步原始仓库 main d3e8bf3

Tags: #task #verification #handoff

Date: 2026-08-30
Scope: global
Status: completed

## Goal

- 在保持 AIOps 私有化 feature 语义和可回退性的前提下，引入原始 Open WebUI 仓库 main 的 460 个新提交。

## Work Summary

- 添加 `upstream=https://github.com/open-webui/open-webui.git`，目标提交为 `d3e8bf3405e848cfba377814d0aa7ba7290e414d`。
- 创建同步前备份分支与标签 `backup/feature-before-main-sync-20260830`，并在独立 integration 分支合并。
- 以上游新组件结构为基线逐项移植 AIOps 品牌、字体/图标、视觉密度、中文设置、Chrome 108 颜色回退和 Pyodide 0.28.x 行为。
- 保留上游新增功能，移除 feature 原本禁用的 Changelog、社区推广、赞助、企业和外部文档入口。

## Files Or Areas

- 后端环境与应用元数据、Svelte 布局/设置/侧栏组件、简体中文翻译、PostCSS 依赖、Pyodide 锁定、静态品牌资源。

## Decisions And Learnings

- Fork 的 `origin/main` 不是原始仓库最新 main；后续同步应显式使用 `upstream/main`。
- 大跨度合并不应恢复整份旧冲突文件；应保留上游重构后的文件并重放 feature 的语义差异。
- Pyodide `^0.28.2` 是 feature 的有意选择，不能被上游 `^314.0.3` 静默覆盖。

## Verification

- `npx vitest run official-style-parity.test.js settings-localization.test.js pyodide-runtime.test.js postcss-chrome109-fix.test.js`：11/11 通过。
- `python -m py_compile backend/open_webui/env.py backend/open_webui/main.py`：通过。
- 自定义品牌资源与备份 feature 的 Git blob 哈希：20/20 一致。
- `git diff --cached --check`、冲突标记与未合并文件检查：通过。
- `npm install --engine-strict=false`：成功，补齐 `docx-preview@0.4.0` 并规范化 PostCSS 锁图；该参数仅用于本机 Node 24 超出项目 22.x 上限的情况。
- 刷新依赖后定向 Vitest：11/11 通过；后端 `py_compile`：通过。
- `npm run check`：未通过，报告仓库既有的 7747 个错误与 201 个警告，主要为 JS 隐式 `any` 和 Svelte `i18n` 类型推断。
- 8 GB Node 堆下 Vite 生产构建：成功，转换 6346 个浏览器模块并写入 `build`；默认约 4 GB 堆会在 chunks 阶段内存不足。

## Next Steps

- 推送 feature 分支前核对远程目标；本次不自动推送。
- 正式开发或 CI 优先使用项目支持的 Node 22；本机 Node 24 仅作为已验证可构建的临时环境。
