# Task: 上游提交与 iframe 鉴权文档

Tags: #task #documentation #verification

Date: 2026-08-30
Scope: global
Status: completed

## Goal

- 生成两份可交接文档：本轮新增提交说明，以及 iframe 场景下的 Token/Cookie 鉴权问题与彻底解决方案。

## Work Summary

- 以同步前 feature、共同基线、上游目标、merge 和依赖刷新提交为边界统计提交和代码差异。
- 将 460 个上游提交按聊天界面、文件预览、工具审批、模型与 Skills、知识检索、认证、性能和国际化归类。
- 核对受保护的头像与文件接口、前端原生资源加载方式和 Cookie 默认配置。
- 记录同源/同站 Nginx、Secure Cookie、sessionId 服务端交换、验证和回退要求。

## Files Or Areas

- `docs/UPSTREAM_MAIN_SYNC_2026-08-30.md`
- `docs/IFRAME_AUTH_AND_RESOURCE_ACCESS.md`
- `.codex-memory/`

## Decisions And Learnings

- 同一台 Nginx 不是浏览器同源/同站的判定依据，最终 URL 才是。
- 只保存 Bearer Token 不能覆盖 `<img>`、音视频、iframe 和新窗口下载；长期方案需要浏览器可发送的 WebUI Cookie。
- 资源接口不应取消鉴权，长期 JWT 不应放入 URL。

## Verification

- Git 范围：`01f4282f1..d3e8bf340` 为 460 个提交；`33aaa43df..HEAD` 为 462 个提交。
- 后端：用户、模型、Webhook 头像及三个文件内容路由均依赖 `get_verified_user`。
- 配置：`WEBUI_*_COOKIE_SAME_SITE` 默认 `lax`，`WEBUI_*_COOKIE_SECURE` 默认 `false`。
- 安全：文档不记录真实 Token、Cookie、账号或证书。

## Next Steps

- 部署实施前确认外层系统正式域名、WebUI 正式域名、Nginx拓扑和是否使用 OAuth/OIDC。
- 完成代理后执行文档中的 Cookie、Network 和资源回归清单。
