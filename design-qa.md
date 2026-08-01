# Design QA — 设置面板字体与中文本地化

## 对照目标

- 视觉基准：
  - 账户菜单：`C:\Users\csc\AppData\Local\Temp\codex-clipboard-a29e4c0d-3cc7-44d9-819d-850f841e5b39.png`
  - 管理员设置：`C:\Users\csc\AppData\Local\Temp\codex-clipboard-7af0c08b-c62e-4cdd-aa8b-07c2488c51e6.png`
- 浏览器实现：
  - 账户菜单：`E:\Project\open-webui\output\playwright\settings-typography-20260801\10-menu-focus-approved.png`
  - 管理员设置：`E:\Project\open-webui\output\playwright\settings-typography-20260801\11-settings-2048x1225-approved.png`
  - Chrome 108 验证：`08-menu-approved.png`、`09-settings-approved.png`

## 采集条件

- 浏览器：Playwright Chromium `108.0.5359.29`。
- 设置页视口与成图：2048 × 1225 CSS 像素、2048 × 1225 物理像素、DPR 1。
- 账户菜单参考图为 342 × 466 裁剪图，来源缩放未知，因此按菜单内部字号层级、行高和相对节奏比较，不直接比较原始像素宽度。
- 状态：管理员已登录、浅色主题、`zh-CN`；账户菜单展开，管理员“扩展功能”设置面板打开。

## 结论

本次范围内没有剩余的 P0、P1 或 P2 问题。

- 字体层级：通过。账户菜单所有操作项统一为 15px/20px；设置页标题和分组标题统一为 16px/24px，功能标签为 14px/20px，说明文字为 13px/18px。
- 字重与圆润度：通过。沿用现有 Archivo/Inter 与中文系统字体回退，标题使用 500，正文保持 400，避免同一层级混用粗细。
- 颜色和特效：通过。浅色主题帮助文字对比度已提高，输入、开关、选中项和弹层阴影在 Chrome 108 中可辨识。
- 布局与间距：通过。没有改动用户要求保留的设置框架；字号提升后未出现裁切、挤压或横向溢出。
- 文案与本地化：通过。设置组件引用的 555 个缺失/空白简体中文条目已补齐；占位符变量全部保留。最终管理员扩展功能面板中没有仅英文的可见文案，API、URL、OAuth/OIDC、MIME、JSON 等技术术语按语义保留。
- 图标与交互：通过。菜单图标与 15px 文字对齐；搜索、账户菜单、设置导航和保存入口状态清晰。

## 五类界面检查

- 账户菜单：姓名、在线状态、状态更新、工作空间、笔记、日程、自动化任务、AI 对话探索区、管理员面板、设置、登出字号一致。
- 用户设置：导航、字段标签、说明、搜索与返回按钮使用统一层级。
- 管理员设置：导航、页面标题、分组标题、字段、说明和保存按钮使用统一层级。
- 集成与扩展：External Tool Servers、Open Terminal、External Knowledge Sources 等用户可见名称已有中文表达；保留必要的产品/协议名。
- 动态设置标题：`SettingsModal.svelte` 的 29 个动态标题均存在非空简体中文翻译。

## 对比迭代记录

1. 初次审计发现账户菜单同时存在 13px 和 14px，设置说明存在 11px，且多处设置文案仍为英文。
2. 首轮修复统一菜单行并补齐翻译；复拍发现 `DropdownMenu` 直接子项的 13px 强制样式仍覆盖账户菜单，旧版 11px 帮助文字也仍可见。
3. 增加非紧凑菜单模式并统一旧帮助文字后，第二次复拍发现设置页顶级标题 14px、子项 13px，层级仍偏弱。
4. 将设置标题调整为 16px、子项调整为 14px、帮助文字调整为 13px 并增强灰度对比。
5. 最终同状态对比未发现可执行的 P0/P1/P2 差异。

## 交互与兼容验证

- 已实际展开账户菜单、打开设置、进入管理员“扩展功能”面板并检查可见文案。
- Chrome 108 页面控制台错误和 page error：0。
- 文档与设置面板横向溢出：false。
- 定向 Vitest：9/9 通过（`postcss-chrome109-fix.test.js`、`official-style-parity.test.js`、`settings-localization.test.js`）。
- 生产构建：通过。

final result: passed
