# 2026-10-27 main 同步、CSV 导入与离线预览

Tags: #task #verification

状态：已完成。开始于 2026-10-27，验收与推送于 2026-10-28。

## 同步与兼容

- 基线：远程 feature `1962b16ed` 与用户已更新的 `origin/main@770cf9f4a`；合并提交 `d4c45c98c`。
- 同步前本地为 `284ad08e5`，备份分支 `backup/feature-before-sync-20261027` 保留。
- `feature_20260730_dev` 已普通推送至 GitHub，代码提交 `0c6f5204d` 已通过 ls-remote 核对；main 仍为 `770cf9f4a`。
- 保留 AIOps 品牌、字号与中文界面、Chrome 108、Pyodide 0.28.3/.data、本地 wheel、Windows 启动及数据库适配。
- 恢复 683 个既有非空中文词条，补齐 265 个新增空白词条，保留全部插值变量。
- npm 与 pnpm 锁文件同步；未更改 npm cache、prefix 或全局代理。GitHub 使用单次 `git -c http.proxy= -c https.proxy=` 直连，原 7890 代理未监听。

## CSV 导入

- 邮箱忽略大小写；已有用户跳过；同一 CSV 内保留首行，后续重复行计入跳过数量。
- 无效行独立报错，后续批次继续导入；加载状态覆盖整个异步导入流程。
- CSV 的 pending/user 均创建为可用 user，admin 保留；手动创建仍支持 pending。
- `Auths.insert_new_auth` 在同一数据库事务写入 User 与 active Auth，避免默认关闭会话共享时留下缺失凭据的用户。
- `/auths/add?skip_existing=true` 返回 null 表示跳过；普通手动添加保留重复邮箱错误；并发唯一约束冲突也正确跳过。
- 网络错误不再误计为已存在用户；不输出 CSV 密码到调试日志。

## 离线预览

- 两个 PDF 查看器统一使用 PDF.js legacy 主程序与 Worker，构建自动打包 cmaps、standard_fonts、wasm、iccs 和许可证。
- 197 个依赖资源与 node_modules 原件 SHA-256 全部相符；CJK CMap、JPEG2000 解码器、qcms WASM 和 ICC 文件均在断外网测试中由本机返回 200。
- 预览专用 `/files/{id}/content/preview.data` 使用通用二进制文件名和类型，并通过 `X-Original-Content-Type` 恢复 Blob MIME；鉴权和原始下载行为通过 HTTP 验证。
- 独立 URL 避开本机下载管理器对旧 `/content` 路径的 PDF 缓存拦截；`?preview=true` 保留兼容。
- Chrome 108 缺少 ReadableStream 异步迭代能力，导致 PDF.js 正文提取失败而缩略图正常；加载 PDF.js 时补齐迭代器，正确取消并释放 reader。
- 来源图标使用本地 favicon，新版差异编辑器增加 Chrome 108 悬停颜色回退。

## 运行环境

- `.venv` 基础解释器已从 Anaconda 3.11.5 切换为独立 CPython 3.11.15，使用 uv venv --allow-existing 保留依赖，PyTorch 仍为 2.8.0+cpu。
- 原生崩溃复现于 Chroma upsert，Windows 事件记录为 Anaconda 目录下旧 MSVCP140.dll 的 0xc0000005；新解释器向量写入、查询、创建知识库和上传索引均通过。
- 本地服务通过 `.venv/Scripts/activate.bat` 与 `backend/start_windows.bat` 正式启动，保持 `http://localhost:8080` 运行，AIOps 0.12.4，首页、/health、/api/config 返回 200。
- SQLite 迁移前备份为 `backend/data/webui.db.backup-20261028-before-main-sync`；现有 3 个用户及其密码、active 状态逐行一致，迁移版本 `0bd252b206fb`。

## 验证

- 全部 Vitest：10 个文件、29 项通过；后端 unittest：4 项通过，包括登录、写入失败回滚、开启会话共享和重复账户凭据保护。
- 最终生产构建通过，crypto 产物校验通过，pnpm 冻结锁文件离线校验通过。
- 最终 CSV 在 Chrome 108 实际导入 26 个新用户、跳过 3 个重复用户；夹杂无效邮箱仍导入后续用户。26 个新账户逐一登录成功，orphan User 为 0，导入 pending 的账户进入正常聊天主页。
- Chromium 108.0.5359.29 与 Chromium 156.0.8078.4 均在屏蔽所有非 localhost/127.0.0.1 请求后显示中文 PDF 正文、两页及缩略图；Chrome 108 的 PDF 缩放、Word 中文/内嵌图片和 PPT 两页/内嵌图片通过。
- 原始下载、二进制预览的字节哈希与上传原件一致；匿名请求 401，无权限用户请求 404。
- 分支无未解决冲突，无本轮删除的跟踪文件；vendor 许可证原有尾部空格保留，避免破坏上游已校验产物。
- 证据保存在未跟踪的 `output/qa-20261028/`，含测试数据库、HTTP/登录结果、日志与截图，不纳入 Git。

## 后续

- 使用原有账号访问本地 8080；业务模型与已有 Open Terminal 等服务继续沿用原配置。
- 说明文档：`docs/OFFLINE_DOCUMENT_PREVIEW.md`。离线分发需保留完整 build/pdfjs 和 build/pyodide。
