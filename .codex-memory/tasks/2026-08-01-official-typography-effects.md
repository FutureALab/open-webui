# 官方字体与特效全站补齐

## 目标

以 `http://localhost:3010/` 官方镜像和对应历史源码为基准，修复 Chrome 108 下字体层级过轻、输入/展示区域不明显、开关效果与官方不一致的问题；设置页不改框架。

## 实施

- 对当前源码与官方历史版本进行逐行签名比对，只恢复非字体内容完全一致位置的官方字重和 `font-primary`。
- 聊天侧栏、欢迎页、消息操作区和输入框恢复 Archivo 与官方文字层级。
- Markdown 标题恢复 semibold；设置标签恢复 medium。
- 通用开关恢复 emerald 启用色、灰色关闭态、细描边和官方尺寸。
- 设置输入区保留 Chrome 108 可见的浅色底面、弱边框和焦点状态。
- 新增定向样式测试，并保留既有 PostCSS Chrome 108 颜色回退。

## 验证

- Chromium：108.0.5359.29。
- 视口：2048×968；DPR 1；浅色主题；zh-CN。
- 已登录 GDP 对话与管理员通用设置均完成截图对照。
- 输入焦点、侧栏展开、设置导航、开关切换并恢复均通过。
- 页面错误 0，失败应用请求 0。
- Vitest 6/6；生产构建通过；生成 CSS 不兼容颜色函数 0。
- `design-qa.md` 最终结果：passed。

## 证据

- `C:\Users\csc\.codex\visualizations\2026\07\31\019fb896-24c3-7051-b5d3-68878e00a9a2\official-style-qa-20260801\03-current-populated-chat-chrome108.png`
- `C:\Users\csc\.codex\visualizations\2026\07\31\019fb896-24c3-7051-b5d3-68878e00a9a2\official-style-qa-20260801\02-current-settings-chrome108.png`
