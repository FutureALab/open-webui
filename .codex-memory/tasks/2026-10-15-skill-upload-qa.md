# Skill 上传全流程验证

日期：2026-10-15。#task #verification

## 完成

- 本地 8080 管理员界面实际批量导入 `E:/Project/test` 的四个 skill；ZIP 测试副本仅排除 `.git`，原目录未修改。
- bazi-skill 10 个文件、mingli-master 14 个文件、playwright 9 个文件、ui-ux-pro-max 31 个文件，共 64 个文件（6 个 base64 二进制文件）。数据库内容和页面单独导出的四个 ZIP 均逐文件 SHA-256 匹配源文件，导出 ZIP 回读解析通过。
- 原 ui-ux-pro-max 的 ID、version_id 和历史快照哈希未改变；同名包导入为独立测试副本。新包保持私有。
- 页面直接上传 playwright 文件夹成功；重复导入默认 Skip，Replace 相同内容成功且不会创建重复版本。
- 文件编辑器能够展开 assets/references/scripts，图片资源预览接口返回 200。
- Close 和 Esc 可关闭导入弹窗，页面滚动恢复；关闭后重复选择同一批 ZIP 能正常预览。修复后未新增浏览器异常。
- 生产构建成功，相关 Vitest 回归测试 17/17 通过。

## 根因与修复

- `common/Modal.svelte` 手动移除已由 Svelte 移除的节点导致 `removeChild` 异常；增加父节点检查。
- Modal 销毁时写入双向绑定的 `show=false` 会覆盖选包后父组件刚设定的打开状态；移除销毁回调中的绑定状态修改。

## 验证到的限制

- 原 mingli-master 文件夹含约 20 MiB 的 `.git/objects/pack/*.pack`，浏览器上传返回 400；当前单文件上限 10 MiB。排除 Git 元数据的 ZIP 可正常导入。
- 原 `E:/Project/test` 同时包含 skill 文件夹和独立 ZIP；实际后端文件夹解析函数拒绝 skill 根目录以外的文件。应选择单个 skill 文件夹，或多选各 skill 的 ZIP。
- 全部导出 ZIP 在两个包的 SKILL.md frontmatter 名称相同时返回 400（导出目录重名）。单独导出四个测试包正常，JSON 导出不受目录重名限制。
- 图片资源独立下载接口返回 200，但本轮浏览器自动化未捕获到下载事件；未将该按钮下载列为通过项。图片字节已通过数据库和 ZIP 校验。

## 证据

- 本地 `output/skill-upload-qa-20261015/` 保存原始/去 Git 元数据 ZIP、文件清单、parser-results.json、stored-files-results.json、export-roundtrip-results.json、构建/测试日志和截图；不纳入 Git。
- 后续任务：用户要求左侧栏顶部 AIOps logo/名称适度放大，以及今天同步新增界面文案简体中文化。
