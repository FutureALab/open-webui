# 设置字体规范化与中文审计

日期：2026-08-01

## 目标

- 统一账户菜单中不同分组的文字大小。
- 检查所有用户与管理员设置面板的标题、标签、说明字号是否规范。
- 翻译应中文化的用户可见英文，同时保留必要技术术语。
- 在 Chrome 108 中确认浅色主题的字体、对比度与布局稳定。

## 实施

- `DropdownMenu.svelte` 新增非紧凑显示模式，账户菜单显式使用该模式，并将所有操作行统一为 15px/20px。
- `SettingsModal.svelte` 和通用 Setting Row/Field/Section 组件建立 16px 标题、14px 标签、13px 说明的层级。
- 管理员/用户集成设置中的次级名称统一为 14px/20px medium。
- 扫描所有设置 Svelte 组件的 i18n 调用，补齐简体中文翻译；人工校正 Open Terminal、Token、Subagents 等词条。
- 新增 `settings-localization.test.js` 防止设置翻译再次出现空值或遗漏。

## 验证

- 定向 Vitest：9/9 通过。
- 生产构建：通过。
- Chromium 108.0.5359.29：账户菜单所有操作项均为 15px/20px；设置页为 16/14/13px 层级。
- 管理员扩展功能面板可见纯英文项：0。
- 页面错误：0；横向溢出：false。
- 设计验收：`design-qa.md`，最终结果 passed。

## 边界

- 用户明确要求不调整设置框架，所以本次没有修改弹层结构、导航信息架构或路由。
- API、URL、OAuth/OIDC、MIME、JSON、文件扩展名等术语按实际语义保留，不做生硬全中文替换。
