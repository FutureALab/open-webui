# 架构决策

## 已接受

- 继续使用 SvelteKit 静态 SPA + FastAPI 模块化单体部署，FastAPI 同时提供 API、Socket.IO 和前端静态资源。
- 保留底层 `open_webui` Python 包名、内部接口和兼容标识；只对白标所需的用户可见层做手术式修改。
- 产品名称默认值固定为 AIOps；社区分享与上游版本更新入口在公开配置中固定关闭。
- Vite 生产构建目标固定为 `chrome108`，依赖或前端基础设施升级后必须用真实 Chromium 108 回归。
