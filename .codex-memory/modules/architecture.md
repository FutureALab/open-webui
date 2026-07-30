# 架构模块

- `src/routes`：SvelteKit 页面与路由。
- `src/lib/components`：聊天、管理、工作区和通用 UI。
- `src/lib/apis`：前端 API 客户端。
- `src/lib/stores`：全局状态和 Socket 状态。
- `backend/open_webui/main.py`：FastAPI 入口、路由挂载和聊天主链路。
- `backend/open_webui/routers`：领域 API。
- `backend/open_webui/utils`：聊天编排、鉴权、插件和通知。
- `backend/open_webui/retrieval`：文档解析、Embedding、RAG 和向量库。
- `backend/open_webui/models`：数据库模型和数据访问。
- `static`：源静态资源；`build` 为前端生产产物。
