# 任务：Chrome 108 官方视觉对齐

日期：2026-08-01

## 目标

以 `http://localhost:3010/` 官方镜像为视觉基准，使 AIOps 在 Chrome 108 浅色主题下的字体、层级、弱背景和控件表现达到近似效果，同时保留 AIOps 品牌和现有功能。

## 实现

- 从仓库历史恢复官方 `Archivo-Variable.ttf`，并恢复 `.font-primary` 字体栈。
- 登录页恢复 Archivo/Vazirmatn 字体、500 字重、官方透明输入样式和密码控件结构。
- 设置页通用输入、选择框和文件夹弹窗恢复官方轻量控件视觉。
- 保留已有 PostCSS 旧版颜色回退、SVG 安全渲染、中文翻译和表单提交状态逻辑。

## 验证

- 浏览器：Chromium 108.0.5359.29。
- 视口：1600×900，浅色主题。
- 官方与 AIOps 登录卡片均为 `(x=576, y=321.5, width=448, height=257)`。
- 字体族、标题 500 字重、输入高度、按钮 40px 高度和 `rgba(77, 77, 77, 0.05)` 背景一致。
- 页面脚本错误为 0；Vitest 3/3 通过；生产构建成功；产物不含 Chrome 108 不支持的现代颜色函数。

## 证据

- 官方：`chrome108-official-parity-20260801/01-official-root-chrome108.png`
- 修改前：`chrome108-official-parity-20260801/02-aiops-root-before-chrome108.png`
- 修改后：`chrome108-official-parity-20260801/03-aiops-root-after-chrome108.png`
