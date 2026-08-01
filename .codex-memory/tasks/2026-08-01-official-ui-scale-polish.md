# Task: 官方界面字号与密度优化

Tags: #task #verification

Date: 2026-08-01
Scope: global
Status: completed

## Goal

- 保留当前设置框架和 AIOps 品牌，放大侧栏、设置页、账户菜单和聊天首页的字体与视觉密度，使 Chrome 108 显示效果接近官方镜像。

## Work Summary

- 将默认侧栏宽度从 245px 调整到 260px，并只迁移旧默认值。
- 统一放大侧栏导航/聊天标题、账户菜单、设置导航及设置行/字段。
- 为账户菜单补齐官方式大头像、姓名和在线状态层级，增强浅色主题前景对比度。
- 放大聊天首页模型标题和建议层级，保留现有输入框位置和页面结构。
- 增加字体渲染优化，并扩展 `official-style-parity.test.js` 锁定新视觉契约。

## Files Or Areas

- `src/lib/components/layout/Sidebar*`
- `src/lib/components/chat/SettingsModal.svelte`
- `src/lib/components/chat/Settings/UserSetting*.svelte`
- `src/lib/components/admin/Settings/AdminSetting*.svelte`
- `src/lib/components/chat/Placeholder.svelte`
- `src/lib/components/chat/Suggestions.svelte`
- `src/app.css`, `src/lib/stores/index.ts`
- `official-style-parity.test.js`, `design-qa.md`

## Decisions And Learnings

- 不使用全局页面缩放；只修改共用组件的字号、行高、间距和默认侧栏宽度，避免破坏其他页面布局。
- 设置页结构差异属于明确的范围外约束；只对齐共享导航和内容字体层级。
- 裁剪参考图必须按相对侧栏比例归一化，不能将未知缩放下的原始像素当作 CSS 像素。

## Verification

- Command: `npx vitest run postcss-chrome109-fix.test.js official-style-parity.test.js`
- Result: 7/7 passed.
- Command: `node --max-old-space-size=8192 node_modules/vite/bin/vite.js build`
- Result: passed; only repository-existing Svelte warnings.
- Browser: Chromium 108.0.5359.29, light theme, `zh-CN`, DPR 1.
- Result: 2048×968 and 1366×768 visual/interaction checks passed; no horizontal overflow or console/page errors.
- QA report: `design-qa.md`, final result `passed`.

## Next Steps

- 等待用户本机预览反馈；如有差异，继续按相同视口和状态做局部对照微调。
