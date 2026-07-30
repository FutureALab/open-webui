# AIOps 更新交接文档

日期：2026-07-31

分支：`feature_20260730_dev`

远程：`origin`（`https://github.com/FutureALab/open-webui.git`）

## 1. 本次更新目标

本次更新以 Open WebUI `0.10.2` 源码为基础完成 AIOps 白标化、本地运行环境搭建和 Chrome 108 兼容验证。

交付范围：

- 将用户可见产品名称统一为 `AIOps`。
- 将站点、登录页、启动页和 PWA 图标替换为 AIOps Logo。
- 屏蔽上游社区、文档、版本发布、更新检查、赞助和企业推广入口。
- 安装源码运行依赖，并处理本机 PyTorch DLL 加载异常。
- 将生产构建目标调整为 Chrome 108。
- 使用指定 Chromium 108 完成首次注册、登录和核心页面回归。
- 补充项目架构、本地安装和启动文档。

## 2. 关键提交

| 提交 | 内容 |
| --- | --- |
| `7f589fa2c` | AIOps 白标、Chrome 108 兼容、Logo、依赖说明和架构文档 |
| `4a4d905bc` | 记录任务完成状态 |

本交接文档会以新的文档提交继续记录。

## 3. 白标改动

### 已替换

- 浏览器标题和默认产品名。
- 登录、注册、首次引导和通知标题。
- 关于页面、站点清单、OpenSearch 描述。
- favicon、Apple Touch Icon、PWA 图标、启动 Logo。
- 管理后台和工具/函数页面中的用户可见产品文案。

主要入口：

- `backend/open_webui/env.py`
- `backend/open_webui/main.py`
- `src/lib/constants.ts`
- `src/app.html`
- `static/static/`
- `backend/open_webui/static/`

### 已屏蔽

- 社区分享和社区发现入口。
- 上游版本更新检查与更新提示。
- 上游文档、版本发布和帮助链接。
- 企业版、赞助和用户数量推广提示。
- “What's New” 更新弹窗。

后端公开配置固定返回：

```text
enable_community_sharing: false
enable_version_update_check: false
```

底层 `open_webui` Python 包名、数据库兼容键和不展示给用户的内部标识仍保留，避免破坏插件、接口和后续升级兼容性。

## 4. 本机运行环境

| 组件 | 当前环境 |
| --- | --- |
| Python | 3.11.5 |
| Node.js | 24.13.0 |
| npm | 11.6.2 |
| Python 虚拟环境 | `.venv` |
| PyTorch | `2.8.0+cpu` |
| Playwright | `E:\Playwright\1.28.1` |
| Chromium | `108.0.5359.29` |

Python 依赖已经安装到 `.venv`。当前 PyTorch 使用：

```text
E:\dependency\torch-2.8.0-cp311-cp311-win_amd64.whl
```

原因是锁文件中的 PyTorch `2.12.1+cpu` 在本机 Windows `10.0.26200` 加载 `c10.dll` 时触发 `WinError 1114`。

重新执行完整 `uv sync` 后，可能需要再次安装本地 PyTorch 轮子：

```powershell
uv pip install --no-cache --no-deps --reinstall `
  --python .venv\Scripts\python.exe `
  E:\dependency\torch-2.8.0-cp311-cp311-win_amd64.whl
```

`uv` 只用于依赖同步，不是 AIOps 的运行时依赖。

## 5. 构建与启动

### 前端生产构建

```powershell
npm run pyodide:fetch
node --max-old-space-size=8192 node_modules\vite\bin\vite.js build
```

构建输出位于 `build/`。Vite 目标在 `vite.config.ts` 中固定为 `chrome108`。

### 后端启动

```powershell
$env:PYTHONPATH = (Resolve-Path backend).Path
$env:WEBUI_SECRET_KEY = .venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"

.venv\Scripts\python.exe -m uvicorn open_webui.main:app `
  --host 127.0.0.1 `
  --port 8080 `
  --loop asyncio
```

访问地址：

```text
http://127.0.0.1:8080
```

当前服务只监听本机回环地址。生产或内网部署时，需要根据网络边界配置监听地址、反向代理、固定密钥、TLS 和访问控制。

## 6. 验收结果

### 后端

- `/health` 返回 `status: true`。
- `/api/config` 返回名称 `AIOps`。
- 社区分享和上游版本更新检查均为关闭状态。
- PyTorch `2.8.0+cpu` 可以导入。
- SentenceTransformer Embedding 模型可以加载。

### 前端构建

- Vite 生产构建成功。
- 构建结果可以由 FastAPI 正常提供。
- 仓库原有的 Svelte 可访问性、自闭合标签和未使用导入警告仍存在，但不阻止构建。

### Chrome 108

使用 `E:\Playwright\1.28.1` 内置 Chromium `108.0.5359.29` 验证：

- 首次管理员注册。
- 登录。
- 聊天首页。
- 系统设置。
- 用户管理。
- 模型工作区。
- 知识库工作区。
- AIOps Logo 加载。
- 页面标题和用户可见品牌扫描。

全新数据目录下的最终首次注册回归没有页面级 JavaScript 错误。

测试截图位于本地 `output/playwright/`，未纳入 Git 提交。

## 7. 本地数据与账号

- 默认数据库：`backend/data/webui.db`
- 本地上传及缓存：`backend/data/`
- 当前开发数据库中存在用于验收的本地管理员账号。
- 出于安全考虑，交接文档不记录账号密码；接手后应立即通过管理界面修改密码或按部署规范重新初始化管理员。
- `WEBUI_SECRET_KEY` 不应提交到仓库。长期部署必须使用固定、随机且安全保存的密钥。

## 8. 已知限制

- 当前没有配置可用的 Ollama 或 OpenAI 兼容模型服务，因此页面和管理功能可用，但不能完成模型推理。
- 默认 Ollama 地址为 `http://localhost:11434`；未启动 Ollama 时日志会出现连接失败。
- 未安装 ffmpeg 时，音频转码相关功能不可用。
- Chrome 108 不支持原生 `oklch()` 和 `color-mix()`；当前构建具有可用颜色回退，已通过实际页面验证。升级 Tailwind、Vite 或 UI 依赖后必须重新回归。
- `.codegraph/` 是本地未跟踪目录，本次没有修改或提交。

## 9. 后续建议

1. 配置实际内网模型服务，并验证聊天流式响应、工具调用和知识库检索。
2. 使用正式域名、固定 `WEBUI_SECRET_KEY`、TLS 和反向代理部署。
3. 删除或重置本地测试管理员，建立正式管理员账号。
4. 补齐 ffmpeg 后验证语音输入、转写和 TTS。
5. 升级前端依赖前保留 Chrome 108 自动化回归。
6. 后续同步 Open WebUI 上游时，重点检查 `env.py`、`main.py`、设置页和静态品牌资源的冲突。

## 10. 相关文档

- [项目架构与本地启动指南](PROJECT_ARCHITECTURE_AND_STARTUP.md)
- [项目记忆索引](../.codex-memory/index.md)
- [AIOps 白标决策](../.codex-memory/decisions/2026-07-31-aiops-white-label.md)
