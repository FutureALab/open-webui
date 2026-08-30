# 上游 main 同步提交说明（2026-08-30）

## 1. 文档目的

本文记录 `feature_20260730_dev` 同步 Open WebUI 原始仓库 `main` 后新增提交的范围、主要功能变化、私有化改动保留情况、验证结果和回退方式。

本文是合并摘要，不替代上游 `CHANGELOG.md`，也不逐条复制 460 条提交记录。

## 2. Git 范围

| 项目           | 提交或分支                                              |
| -------------- | ------------------------------------------------------- |
| 当前功能分支   | `feature_20260730_dev`                                  |
| Fork 远程      | `origin=https://github.com/FutureALab/open-webui.git`   |
| 原始仓库远程   | `upstream=https://github.com/open-webui/open-webui.git` |
| 上游共同基线   | `01f4282f1ffe0d6212f58d3afbeae21fffd0c4be`              |
| 同步前 feature | `33aaa43df163b3f0da08d750a9af179bc317f027`              |
| 上游目标       | `d3e8bf3405e848cfba377814d0aa7ba7290e414d`              |
| 合并提交       | `37e1365c9784dc403fefb5539e2363de15debcb6`              |
| 依赖刷新提交   | `ba61add9af3521612ae6ceec51ac60acb272e732`              |
| 回退分支及标签 | `backup/feature-before-main-sync-20260830`              |

从共同基线到上游目标共 460 个提交，其中 459 个为非 merge 提交。同步前 feature 到当前分支共新增 462 个可达提交：460 个上游提交、1 个本地 merge 提交和 1 个依赖刷新提交。

上游范围的代码规模：

- 548 个文件发生变化。
- 新增 38,880 行。
- 删除 16,250 行。

合并并保留 feature 语义后的最终差异：

- 551 个文件发生变化。
- 新增 38,952 行。
- 删除 16,229 行。

前端 `package.json` 版本从 `0.11.0` 更新到 `0.11.1`。

## 3. 上游更新重点

### 3.1 聊天、侧栏和界面设置

- 大幅调整聊天主界面、侧栏、模型选择器、消息输入区和设置组件。
- 将原有界面设置拆分到新的 `InterfaceSettings.svelte`，减少单一设置组件的体积。
- 加强窄屏和移动端布局，新增移动滑动面板、可调整大小侧栏等通用组件。
- 修复加载历史消息时视口跳动、侧栏目录重复刷新、聊天拖放无效刷新、折叠侧栏挤压等问题。
- 增加侧栏聊天悬浮预览开关，并修复悬浮预览中嵌入内容的安全隔离。

主要相关目录：

- `src/lib/components/chat/`
- `src/lib/components/layout/Sidebar/`
- `src/lib/components/common/`
- `src/lib/components/admin/Settings/`

### 3.2 文件浏览和文档预览

- 重构聊天文件导航、文件图标、文件工具栏和文件预览。
- 新增 DOCX 与 PPTX 预览组件，并新增 `docx-preview@0.4.0` 依赖。
- 增强图片、音频、视频、PDF、Office 文档和终端输出文件的展示能力。
- Web 抓取文档改为流式写盘，避免把完整内容一次性缓存在内存中。
- 将抽取后的文档元数据限制在上传大小上限内，降低异常大元数据带来的资源风险。

新增的代表性文件：

- `src/lib/components/common/DocxPreview.svelte`
- `src/lib/components/common/PptxPreview.svelte`
- `src/lib/components/chat/FileNav/FileTypeIcon.svelte`
- `src/lib/components/chat/Messages/TerminalOutputFile.svelte`

### 3.3 工具调用、Ask User 和审批

- 新增 Ask User 后端工具和前端交互卡片。
- 新增工具执行审批逻辑，用于在执行敏感或需要用户确认的工具前暂停并等待确认。
- 改进内置工具参数序列化缓存，减少每次请求重复深拷贝工具定义的开销。
- 修复工具服务器连接错误日志、连接级 Cookie 绑定和旧版函数调用路径的功能开关校验。
- 将代码解释器标签检测限制到旧版工具调用模式，避免影响新工具调用路径。

主要新增文件：

- `backend/open_webui/utils/ask_user.py`
- `backend/open_webui/utils/tool_approval.py`
- `src/lib/components/chat/AskUserCard.svelte`

### 3.4 模型、Skills、Tools 和外部连接

- 优化模型工作区和管理员模型管理界面，支持批量管理 Provider 模型。
- 优化模型、Skill、Tool 和共享文件访问查询，减少先加载全部记录再在 Python 中过滤的情况。
- 修复连接前缀在模型 ID 与显示名称之间不一致、模型同步失败无提示、模型头像无法重置等问题。
- 加强 Skill ID 的 URL 路径安全校验。
- 外部知识连接只有在最后一个关联知识库移除后才会删除，避免提前清理仍在使用的连接。

### 3.5 知识库、检索和 Web 搜索

- 更新知识库、文件权限、外部知识源和检索流水线。
- 新增 OpenSERP Web 搜索 Provider 的界面支持。
- 统一 Web 抓取地址安全检查，降低不同加载器重复实现造成的不一致。
- Playwright Web Loader 改用共享 HTTP Client。
- 修复模型附加知识文件权限、Agentic Retrieval 用户上下文、Web 搜索错误状态等问题。
- 扩展或修复 Milvus、PGVector、Qdrant、OpenSearch、Oracle、S3 Vector、Valkey 等向量数据库适配。
- PGVector 增加 RDS IAM Token 认证支持。

### 3.6 认证、OAuth、SCIM 和审计事件

- 密码修改后撤销用户现有会话，减少旧 Token 继续有效的风险。
- SSO 登录和退出产生统一的认证审计事件。
- OAuth 用户组同步产生组事件，并修复双重编码的 OAuth 用户数据。
- 可信请求头、OAuth 持久化配置、SCIM 和用户角色/组同步逻辑得到更新。
- 新增或更新以下数据库迁移：
  - `1ce6ade7d93b_add_group_member_user_id_index.py`
  - `6d09d1bf1f23_repair_double_encoded_user_oauth.py`
  - `d4c1a8e37b62_add_chat_timer_at_and_chat_indexes.py`

### 3.7 性能和稳定性

- 对大型 SQLite 实例的聊天查询增加索引。
- 批量处理共享目录、聊天消息、组成员及目录权限查询。
- 减少流式响应保存时对完整响应文本或聊天 JSON 的重复扫描和复制。
- 避免在 SSE 流整个生命周期内持有数据库连接。
- 对用户 `last_active_at` 写入进行节流。
- 支持关闭 WebSocket per-message-deflate，适配对内存或 CPU 更敏感的部署。
- 修复超长流式行、非字符串流内容、缺少时间戳的推理项和缓存清理任务异常。

### 3.8 国际化和可访问性

- 新增 Faroese 和 Slovenian 翻译。
- 更新法语、葡萄牙语、加泰罗尼亚语、匈牙利语、韩语等多种语言。
- 改进设置菜单、集成菜单和切换控件的辅助技术状态描述。

## 4. feature 私有化语义保留情况

合并冲突不是通过恢复整份旧文件解决，而是以上游新组件结构为基础重新应用 feature 的语义差异。以下内容继续保留：

- 产品名称和用户可见品牌保持为 AIOps。
- 私有 Logo、favicon、PWA 图标、启动图和 Archivo 字体资源保持不变。
- 侧栏、账户菜单、设置页的字体层级与界面密度保持 feature 设定。
- Chrome 108 的 PostCSS 颜色回退流程继续有效。
- 简体中文设置翻译及本地化完整性测试继续保留。
- 社区分享、赞助、企业推广、外部文档和 Changelog 前端入口继续按 feature 要求隐藏。
- Pyodide 保持 `^0.28.2`，本地缓存实际版本为 `0.28.3`。
- `python_stdlib.data` 通用静态别名及主线程/Worker 加载流程继续保留。

品牌资源校验使用 Git Blob 哈希比对，同步后的 20 项 Logo、PWA、启动图和字体资源与同步前 feature 一致。

## 5. 依赖刷新提交

`ba61add9a` 在网络恢复后执行依赖刷新，主要结果为：

- 补齐上游新增的 `docx-preview@0.4.0`。
- 规范化 `package-lock.json` 中 PostCSS 依赖关系。
- 保留 Chrome 108 所需的：
  - `@csstools/postcss-color-mix-function`
  - `@csstools/postcss-oklab-function`
  - `postcss-nesting`
- 同步更新项目记忆中的构建和验证状态。

本机 Node.js 为 `24.13.0`，超过项目声明的最高 `22.x`。安装时仅对该次命令使用 `--engine-strict=false`，没有修改系统或 npm 的持久配置。

## 6. 验证结果

| 验证项               | 结果                                                                |
| -------------------- | ------------------------------------------------------------------- |
| 私有化 Vitest        | 4 个文件、11 项全部通过                                             |
| Python 语法检查      | `backend/open_webui/env.py`、`main.py` 通过                         |
| 品牌资源哈希         | 20/20 与同步前 feature 一致                                         |
| 冲突标记和未合并文件 | 未发现                                                              |
| 生产构建             | 8 GB Node 堆下成功，转换 6,346 个浏览器模块                         |
| 全量 `npm run check` | 未通过：7,747 个错误、201 个警告，主要为仓库既有 JS/Svelte 类型问题 |

生产构建命令：

```powershell
node --max-old-space-size=8192 node_modules\vite\bin\vite.js build
```

默认约 4 GB Node 堆会在生成 chunks 阶段内存不足。这是构建环境限制，不是合并冲突或运行时代码错误。

## 7. 回退方式

同步前状态由分支和标签双重保存：

```text
backup/feature-before-main-sync-20260830
```

只查看或验证同步前状态时，建议创建临时分支或独立 worktree，不要对当前 feature 执行破坏性 reset。

如果需要撤销 merge，应先确认 `ba61add9a` 之后是否又产生了业务提交，再选择 `git revert` 或从备份点创建恢复分支。不要直接使用 `git reset --hard`，避免覆盖未提交工作。

## 8. 当前状态

- 当前分支：`feature_20260730_dev`。
- 本文统计使用的同步后代码基线：`ba61add9a`；文档提交位于该提交之后。
- 写入本文前相对 `origin/feature_20260730_dev` ahead 462；文档提交会再增加 1 个本地提交。
- 本次同步和依赖刷新尚未自动推送远程。
