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
- `npm run build`：编译 672 个模块后因旧 `node_modules` 缺少 `docx-preview` 停止；需联网安装上游依赖后复跑。

## Next Steps

- 网络恢复后执行 `npm install`、`npm run check` 和 `npm run build`。
- 推送 feature 分支前核对远程目标；本次不自动推送。
