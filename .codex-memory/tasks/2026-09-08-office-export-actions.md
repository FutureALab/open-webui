# Open WebUI Office 导出按钮

## 状态

已完成。`http://localhost:8080/` 已注册并全局启用 `office_export_buttons` Action，回答底部显示“生成 Word”“生成 Excel”“生成 PPT”三个按钮。

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

## 使用

打开任意已有回答或新回答，在回答底部点击 W、X、P 图标即可生成相应 Office 文件。
