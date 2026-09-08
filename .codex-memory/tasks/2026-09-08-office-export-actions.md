# Open WebUI Office 导出按钮

## 状态

已撤销。`office_export_buttons` 曾于 2026-09-07 注册并全局启用，后按用户要求于 2026-09-08 从本地 WebUI 数据库删除，仓库中的 Action 源码也已移除。

## 实现

- 功能源码位于 `scripts/open-webui-functions/office_export_action.py`。
- Action 将当前助手回答发送给本机 Open Terminal，在 `/home/user/exports` 生成 DOCX、XLSX 或 PPTX。
- Word 保留标题、列表、代码段和 Markdown 表格的基本结构；Excel 将正文和识别到的表格写入工作表；PPT 按标题拆分页面。
- Open Terminal 连接 `local` 已校验并启用；认证密钥仅保存在本机 WebUI 配置中，不写入仓库或项目记忆。

## 验证

- Python 语法检查通过。
- WebUI 模型接口正确返回三个子 Action。
- 在现有对话中分别点击三个按钮，DOCX、XLSX、PPTX 均生成成功且文件大小非零。
- 测试文件位于 Open Terminal 的 `/home/user/exports`。

## 撤销记录

- 2026-09-08：确认数据库中昨日创建的 Action 仅有 `office_export_buttons` 一个，并已精确删除。
- Open Terminal 服务及既有测试文件未删除；它们不属于 Action 本身。

## 使用

本功能当前不再可用。如需恢复，可从提交历史取回 Action 源码并重新导入。
