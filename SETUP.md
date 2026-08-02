# Open WebUI 后端开发环境搭建指南

## 前置条件

- macOS (Apple Silicon)
- Homebrew 已安装
- Node.js >= 18.13.0 (用于 pip install 时的前端构建)

## Python 版本兼容性问题

**项目要求:** Python `>= 3.11, < 3.13.0a1`（定义在 `pyproject.toml` 的 `requires-python`）

**系统默认 Python:** 3.13.3（通过 Homebrew 安装）— **不兼容**

**解决方案:** 使用 Homebrew 安装的 Python 3.12.10 创建虚拟环境。

## 搭建步骤

### 1. 确认 Python 3.12 可用

```bash
# 检查已安装的 Python 版本
/opt/homebrew/bin/python3.12 --version  # Python 3.12.10

# 如果未安装，使用 Homebrew 安装
brew install python@3.12
```

### 2. 创建虚拟环境

```bash
# 在项目根目录创建 .venv
/opt/homebrew/bin/python3.12 -m venv .venv
```

### 3. 安装后端依赖

```bash
# 使用项目本地的 .venv pip 安装（editable 模式）
# 注意：这也会触发前端构建（hatch_build.py 中的 npm install + npm run build）
# 整个过程可能需要几分钟，取决于网络速度
.venv/bin/pip install -e .
```

### 4. 配置环境变量

复制 `.env` 文件（如不存在则需要创建），关键配置项：

```bash
# 必需：WEBUI_SECRET_KEY，启动时会自动生成，也可以手动设置
# 建议创建一个持久化的密钥文件
head -c 24 /dev/random | base64 > backend/.webui_secret_key

# OpenAI API 配置（如需使用 OpenAI 兼容的 API）
OPENAI_API_BASE_URL='your-api-base-url'
OPENAI_API_KEY='your-api-key'

# CORS 配置（开发环境可以放宽）
CORS_ALLOW_ORIGIN='*'
```

### 5. 启动后端服务

```bash
# 方式一：直接使用 uvicorn（推荐开发使用）
WEBUI_SECRET_KEY=$(cat backend/.webui_secret_key) \
  .venv/bin/python -m uvicorn open_webui.main:app --host 0.0.0.0 --port 8080

# 方式二：使用 start.sh 脚本
export WEBUI_SECRET_KEY=$(cat backend/.webui_secret_key)
bash backend/start.sh
```

启动后访问 `http://localhost:8080` 确认服务正常运行。

## 关键注意事项

1. **Python 版本锁定:** 始终使用 `.venv` 中的 Python 3.12 解释器（`.venv/bin/python`），不要使用系统默认的 Python 3.13。
2. **前端构建:** `pip install -e .` 会自动执行 `npm install --force && npm run build` 构建前端静态资源。
3. **WEBUI_SECRET_KEY:** 这是后端启动的硬性要求，缺少时服务会直接报错退出。
4. **数据库:** 默认使用 SQLite，数据库文件位于 `backend/data/webui.db`，启动时会自动运行 Alembic 迁移。

## 快速启动命令汇总

```bash
# 一站式启动（从项目根目录执行）
cd /Users/hanxuelei/python_project/open-webui

# 生成密钥（仅首次）
head -c 24 /dev/random | base64 > backend/.webui_secret_key

# 启动后端
WEBUI_SECRET_KEY=$(cat backend/.webui_secret_key) \
  .venv/bin/python -m uvicorn open_webui.main:app --host 0.0.0.0 --port 8080
```

# 交叉编译
docker buildx build --platform linux/amd64 -t open-webui:feature_20260730_dev-fa5b87280 -t open-webui:latest-amd64 --load --network host \
  --build-arg HTTP_PROXY=http://192.168.2.234:7890 \
  --build-arg HTTPS_PROXY=http://192.168.2.234:7890 \
  --build-arg NO_PROXY="localhost,127.0.0.1,*.aliyun.com,mirrors.aliyun.com"  -f /Users/hanxuelei/python_project/open-webui/Dockerfile /Users/hanxuelei/python_project/open-webui 2>&1


docker run --platform linux/amd64 -d -p 3000:8080 -e OPENAI_API_KEY=sk-33e0546f0f8c4b1aa1b9b8bcdce47ef6 -e OPENAI_API_BASE_URL=https://api.deepseek.com -v open-webui:/app/backend/data --name open-webui --restart always open-webui:latest-amd64