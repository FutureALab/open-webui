# 当前任务

## 2026-10-28 main 同步、CSV 与离线预览

- 状态：已完成，代码 `0c6f5204d` 已普通推送到 `origin/feature_20260730_dev`，远程 main `770cf9f4a` 为其祖先。
- 用户导入：重复邮箱跳过、坏行不中断、pending 导入为 user，用户资料与有效凭据原子写入。
- 预览：本地 PDF.js 全资源、二进制 preview.data 通道、Chrome 108 文本流兼容；Word/PPT 内嵌内容断外网实测通过。
- 验证：29 项前端与 4 项后端测试、生产构建、冻结锁文件、197 个资源哈希、26 个新用户逐一登录通过。
- 本地：独立 CPython 3.11.15 的 `.venv`，已使用现有 Windows 启动脚本运行 AIOps 0.12.4，地址 `http://localhost:8080`；沿用原有账号。
- 数据：迁移前 SQLite 备份已保留，3 个原有用户及凭据一致；详情见 [[tasks/2026-10-27-main-csv-offline-preview]]。


## 2026-10-14 同步上游 main 与 feature

- 状态：已完成；main 与 feature 已通过普通原子 push 同步到 origin，本地生产页面保持运行。
- 分支用途：`main` 用于同步 `open-webui/open-webui:main`；`feature_20260730_dev` 用于 AIOps 自定义改造。
- 上游目标：`f8ae8a6c328946dc62cd0712961a0632574581bf`，远程 main 原为 `4f167730e`，远程 feature 原为 `463659459`。
- 备份：`backup/feature-before-sync-20261014` 保存本地原 feature；`backup/main-before-sync-20261014` 保存远程原 main。
- 保留范围：AIOps 白标、Chrome 108、中文设置、Pyodide 0.28.x 与 `.data` 标准库、Claude Pipe、S3/Qdrant、本地 PostgreSQL/Windows 启动和构建流水线。
- 结果：main 同步提交 `ce56d8e0c`；feature 合并/适配提交 `1c40046fb`，已保留本地和远程双方历史。
- 验证：Vitest 13/13、最终生产构建、23 个品牌资源哈希、Pyodide 标准库别名和实际 Excel 生成均通过；CSS 不兼容颜色声明为 0。
- 本地：`http://localhost:8080` 显示 AIOps 0.12.0，健康检查 200；Codex 浏览器登录页已保留，控制台错误为 0，使用原有账号登录。
- 数据：SQLite 已备份并迁移到 `b8f2c6d91a04`；既有 Open Terminal 配置的 8000 端口外部服务未运行。
- 下一步：后续按 `docs/UPSTREAM_SYNC.md` 同步；业务改造继续在 `feature_20260730_dev`。

## 2026-09-08 Open WebUI Office 导出按钮

- 状态：已撤销。`office_export_buttons` 已按用户要求从本机 WebUI 数据库删除，仓库源码同步移除。
- 运行方式：通过已启用并验证的本机 Open Terminal 连接生成文件，输出目录为 `/home/user/exports`。
- 验证：三个格式均已从现有回答实际生成，文件存在且大小非零；认证密钥未写入仓库或项目记忆。
- 保留项：Open Terminal 服务、连接配置及既有测试文件未删除，等待用户决定是否继续保留。

## 2026-08-31 汇合并推送远程 feature

- 状态：已完成。远程 `feature_20260730_dev` 的 7 个独有提交已合并到本地，merge commit `0a67db76a` 已通过普通非强制 push 推送到同名远程分支。
- 范围：Claude Pipe、PostgreSQL 本地开发、S3 路径、Qdrant 本地代理绕过、Chrome 108 悬浮预览边框和测试交接文档。
- 冲突：3 个项目记忆文件保留双方条目；Windows 启动脚本同时保留安全密钥生成、Selector 事件循环和 WebSocket 压缩开关。
- 验证：Python 语法通过，私有化 Vitest 12/12 通过，Docker Compose 配置有效，Markdown 和 Git 差异检查通过。
- 远程确认：`origin/feature_20260730_dev` 从 `e5f8b42ed` 前进到 `0a67db76a`，未使用 force push。
- 回退点：合并前本地提交 `9e186e59744a755c0f4760a525fcc5f325fae718`。

## 2026-08-30 上游提交与 iframe 鉴权文档

- 状态：已完成。新增上游 main 同步提交说明和 iframe 受保护资源鉴权方案文档。
- 上游说明以 `01f4282f1..d3e8bf340` 的 460 个提交及 `33aaa43df..ba61add9a` 的最终 feature 差异为事实基线。
- iframe 文档确认用户头像、模型头像、Webhook 头像和文件内容接口均依赖登录；长期方案为同源/同站反向代理与 HttpOnly Cookie，而不是取消鉴权或在 URL 中传递长期 JWT。
- 验证：Git 提交计数与差异统计、后端路由依赖、Cookie 环境变量和前端原生资源使用点均已核对。

## 2026-08-30 上游 main 同步

- 状态：已完成。`feature_20260730_dev` 已生成合并提交 `37e1365c9784dc403fefb5539e2363de15debcb6`，依赖已刷新并完成生产构建验证；尚未推送。
- 目标：将 `open-webui/open-webui` 的 `main@d3e8bf3405e848cfba377814d0aa7ba7290e414d` 合并到 `feature_20260730_dev`，保持 AIOps 白标、字体/图标、Chrome 108 回退、中文设置与 Pyodide 0.28.x 行为。
- 回退点：分支与标签 `backup/feature-before-main-sync-20260830` 均指向同步前提交 `33aaa43df163b3f0da08d750a9af179bc317f027`。
- 验证：自定义 Vitest 11/11、后端 `py_compile`、资源哈希一致、无冲突标记；联网刷新依赖后，Vite 在 8 GB Node 堆下成功构建 6346 个浏览器模块并写入 `build`。
- 环境说明：本机 Node 24.13.0 超出项目声明的最高 22.x；安装使用单次 `--engine-strict=false`，生产构建实际通过。全量 `svelte-check` 仍有仓库既有的 7747 个错误和 201 个警告。

## 2026-08-04 PostgreSQL 17 本地开发启动

状态：已完成。远程分支已是最新；PostgreSQL 17 Alpine 由 Docker 单独运行，本地后端通过 `localhost:5432` 连接，本地前端通过 `localhost:5173` 访问后端 `localhost:8080`。Windows 启动脚本已切换为 Selector 事件循环，避免 psycopg 异步连接与 ProactorEventLoop 不兼容。

验证：Compose 配置有效；PostgreSQL 17.10 健康，Alembic 为 `f0bd01a18a3d`，public schema 共 43 张表；`backend/start_windows.bat` 启动后 `/health` 返回 200；Vite 首页及 `/api/config` 均返回 200；验证后 5173、8080、5432 均已停止监听。

启动顺序：`docker compose up -d postgres`，激活 `.venv` 后运行 `backend\start_windows.bat`，最后运行 `npm run dev`。详见 [[tasks/2026-08-04-postgresql17-local-development]]。

## 历史上下文

状态：远程交叉编译提交的 merge 冲突已按用户决策解决：Chrome 108/109 PostCSS 文件保留本地版本，Pyodide 准备脚本采用跨平台缓存、可选环境代理和 PyPI lock 恢复方案；标准库同时打包等内容的通用 `.data` 静态别名，两个浏览器运行入口均显式使用该别名。定向测试、资源准备、生产构建、后端启动和浏览器 Python 实跑均通过。

范围：

- AIOps 名称与 Logo 白标。
- 隐藏上游文档、社区、赞助、企业和版本更新入口。
- 安装本地 Python 依赖并解决 PyTorch Windows 加载问题。
- Chrome 108 全流程兼容测试。
- Chrome 108 浅色主题颜色、边框和阴影兼容修复。
- Markdown SVG 安全渲染及设置页中文本地化补充。
- 恢复官方 Archivo 字体与登录页字体层级。
- 将登录页及设置类控件回调到官方轻量视觉，并保留构建期旧版 Chrome 颜色回退。
- 以官方镜像 `http://localhost:3010/` 为基准完成 Chrome 108 像素级复核。
- 恢复全站仍与官方源码结构一致位置的 medium/semibold 字重，修复此前被整体扁平化的视觉层级。
- 恢复聊天侧边栏、消息区、输入区与设置标签的官方字体栈和层级。
- 恢复设置页绿色开关、浅色输入底色和弱边框，不调整设置页框架与布局。
- 在 2048×968、浅色主题、中文环境下完成已登录聊天及设置页 Chrome 108 视觉/交互验收。
- 默认侧栏宽度由 245px 调整为 260px，并仅迁移旧默认值，不覆盖用户自定义宽度。
- 主侧栏导航提升到 15px，聊天标题提升到 15px；账户菜单所有操作项统一为 15px/20px，消除上下分组字号不一致。
- 设置页标题/分组标题统一为 16px/24px，功能标签为 14px/20px，说明文字为 13px/18px，并提升浅色主题对比度。
- 补齐所有设置组件引用的 555 个缺失或空白简体中文翻译，保留 API、URL、OAuth/OIDC 等必要技术术语。
- 新增设置本地化自动检查，确保设置组件引用的简体中文键非空且占位符不丢失。
- 聊天首页模型标题提升到 28px，建议标题提升到 16px，保持输入框布局不变。
- 在 2048×968 与 1366×768 下完成最终 Chrome 108 视觉和溢出检查，控制台错误为 0。
- 架构与启动文档。
- 更新项目记忆并提交本轮修复。
- Pyodide 准备脚本使用实际安装版本验证缓存，可选读取标准代理环境变量，并在复制运行时后恢复 PyPI-only lock 条目。
- 公共运行时使用通用 `python_stdlib.data` 静态别名，不包含特定下载管理器配置；原始 zip 仍保留，别名由跨平台准备脚本生成。
- 删除未被当前入口引用的更新公告组件及其前端状态/API，并放大侧栏品牌图标和聊天首页模型头像。

下一步：推送前核对 `origin` 目标；如需严格复现官方支持环境，使用 Node 22 重新执行安装与构建。
# 2026-10-15 当前进展

- Skill 上传验证完成，详见 [[tasks/2026-10-15-skill-upload-qa]]。Close/重开修复已构建并通过浏览器测试及 17 项回归测试。
- 左侧栏顶部 AIOps logo/名称已放大，补齐 158 个空中文词条和技能硬编码文案；21/21 测试、生产构建和浏览器验收通过，见 [[tasks/2026-10-15-sidebar-skill-localization]]。
