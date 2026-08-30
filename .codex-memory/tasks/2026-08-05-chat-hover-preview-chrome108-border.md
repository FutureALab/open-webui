# Chrome 108 聊天悬浮预览边框

#task #verification

- 日期：2026-08-05
- 目标：修复聊天侧边栏悬浮预览在 Chromium 108 中轮廓过淡的问题，同时保持现代 Chrome 的现有布局与视觉层级。
- 根因：浮层使用 `ring-black/5`，5% 黑色轮廓与阴影共用 `box-shadow` 合成链，在 Chromium 108 中边界辨识度不足。
- 修复：改用独立的 `1px` 实体边框；浅色主题使用 `gray-200`，深色主题使用 `gray-700`，保留原有圆角、尺寸、定位和阴影。
- 回归测试：定向 Vitest 2 个文件、8 项全部通过；生产构建成功。
- 浏览器验证：Chromium `108.0.5359.29` 和 Chrome `151.0.7922.71` 均计算为 `1px solid rgb(228, 228, 228)`、`16px` 圆角，页面错误为 0；Chromium 108 访问本地 AIOps 返回 HTTP 200。
- 相关文件：`src/lib/components/layout/Sidebar/ChatHoverPreview.svelte`、`official-style-parity.test.js`。
