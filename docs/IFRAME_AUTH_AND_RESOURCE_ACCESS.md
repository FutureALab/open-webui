# iframe 场景下的鉴权与受保护资源访问方案

## 1. 问题场景

Open WebUI 被其他内网页面通过 iframe 嵌入：

```html
<iframe
	src="https://webui.example.internal/?sessionId=one-time-code"
	style="width: 100%; height: 100%; border: 0"
></iframe>
```

页面主体和普通 JSON API 可能正常，但头像、文件、音视频或 PDF 返回 `401 Not authenticated`。

## 2. 根因

Open WebUI 的后端鉴权接受两种主要凭据：

1. `Authorization: Bearer <JWT>` 请求头。
2. 名为 `token` 的 Cookie。

实现位于 `backend/open_webui/utils/auth.py` 的 `get_current_user()`。

普通前端 API 使用 `fetch`，可以从前端登录状态读取 Token 并添加 Bearer 请求头。浏览器原生资源加载则不同：

```text
<img src="...">
<audio src="...">
<video src="...">
<iframe src="...">
CSS background-image: url(...)
window.open(...)
```

这些请求不能由组件直接添加 Bearer 请求头，只能依赖浏览器自动发送 Cookie。当 Open WebUI 位于跨站 iframe 中时，默认 `SameSite=Lax` Cookie可能不发送，因此受保护资源接口鉴权失败。

URL 中的 `sessionId` 不是当前 Open WebUI 内置的认证参数。除非反向代理或自定义后端主动验证并兑换登录状态，否则：

```text
?sessionId=xxxx
```

不会为后续头像、文件等子资源请求提供身份。

## 3. 已确认受影响的接口

| 类型         | 接口                                                       | 前端使用方式                        |
| ------------ | ---------------------------------------------------------- | ----------------------------------- |
| 用户头像     | `GET /api/v1/users/{user_id}/profile/image`                | `<img>`、通知图标、CSS              |
| 模型头像     | `GET /api/v1/models/model/profile/image?id=...`            | `<img>`、CSS 背景                   |
| Webhook 头像 | `GET /api/v1/channels/webhooks/{webhook_id}/profile/image` | `<img>`                             |
| 文件内容     | `GET /api/v1/files/{id}/content`                           | 图片、音频、视频、PDF、下载、新窗口 |
| HTML 文件    | `GET /api/v1/files/{id}/content/html`                      | iframe                              |
| 命名文件下载 | `GET /api/v1/files/{id}/content/{file_name}`               | 下载或新窗口                        |

这些接口均依赖 `get_verified_user`。

其中 `src/lib/apis/files/index.ts` 的 `getFileContentById()` 当前只使用 `credentials: 'include'`，没有添加 Bearer Token。因此 Cookie 被阻止时，即使通过 JavaScript 获取文件内容也可能失败。

可能出现的用户症状：

- 用户或模型头像不显示。
- 聊天上传图片无法预览。
- 音频、视频无法播放或拖动。
- PDF、DOCX、PPTX 等文件预览失败。
- 知识库引用文件打不开。
- 下载或新窗口打开文件返回 401。

## 4. 彻底解决原则

不要逐个取消接口鉴权，也不要把长期 JWT 拼在资源 URL 中。完整解决方案应满足：

1. iframe 与外层系统在浏览器看来同源或至少同站。
2. 登录流程最终由 Open WebUI 签发 `token` Cookie。
3. 浏览器能够对所有受保护资源请求自动携带该 Cookie。
4. Nginx 保留 WebSocket、流式响应、Cookie 和 Range 请求能力。

推荐链路：

```text
外层内网系统
  → iframe 使用同源或同站 WebUI 地址
  → Open WebUI 登录或 sessionId 服务端交换
  → Set-Cookie: token=...; HttpOnly; Secure; SameSite=Lax
  → img/audio/video/iframe/files 自动携带 Cookie
  → get_verified_user 鉴权成功
```

## 5. Nginx 部署方式

### 5.1 最稳：同源路径

```text
外层系统：https://portal.company.example/
WebUI：   https://portal.company.example/webui/
```

同协议、同主机、同端口，属于完全同源。采用该方式前需要验证当前 WebUI 静态资源、API、前端路由和 WebSocket 在 `/webui/` 基础路径下是否全部正确，避免只代理 HTML 而遗漏根路径资源。

### 5.2 更易兼容根路径应用：同站子域名

```text
外层系统：https://portal.company.example/
WebUI：   https://webui.company.example/
```

两者同为 HTTPS，并共享可注册主域 `company.example`，属于同站但不同源。WebUI 仍运行在 `/`，通常比子路径部署更少涉及资源路径改写。

同站不代表外层页面可以直接访问 iframe DOM；如需交互，应使用经过来源校验的 `postMessage`。

### 5.3 仅使用同一个 Nginx 并不充分

浏览器只判断最终 URL，不知道两个地址是否由同一台 Nginx 提供。例如：

```text
外层系统：https://portal.company.example/
WebUI：   https://100.102.123.123:3000/
```

仍然是跨站。即使后端实际位于同一台服务器，也不能解决 `SameSite=Lax` Cookie问题。

### 5.4 WebUI 反向代理模板

以下模板适用于把 WebUI 暴露在独立的同站 HTTPS 子域名。证书路径应由部署环境提供，不写入仓库。

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl;
    server_name webui.company.example;

    location / {
        proxy_pass http://100.102.123.123:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto https;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
```

Nginx 默认会转发 `Set-Cookie` 和 `Range` 请求。部署配置不要主动删除 `Set-Cookie`、`Cookie`、`Range` 或 `Content-Range`。

## 6. Cookie 配置

### 6.1 同源或同站部署

```env
WEBUI_AUTH_COOKIE_SAME_SITE=lax
WEBUI_AUTH_COOKIE_SECURE=true
WEBUI_SESSION_COOKIE_SAME_SITE=lax
WEBUI_SESSION_COOKIE_SECURE=true
```

影响：

- `SameSite=lax` 是当前默认值，主要用于阻止跨站 iframe 和跨站子资源发送 Cookie。
- `Secure=true` 要求浏览器只通过 HTTPS 发送 Cookie。
- Nginx 到 WebUI 的内网反代仍可使用 HTTP，Secure 判断发生在浏览器到 Nginx 的连接上。
- 直接访问 `http://100.102.123.123:3000` 时，Secure Cookie不会发送，可能出现登录循环或 401。

修改后需要：

1. 重启 Open WebUI。
2. 清除旧域名和旧 IP 下的 Cookie。
3. 通过正式 HTTPS 地址重新登录。

### 6.2 无法改为同站时的临时方案

```env
WEBUI_AUTH_COOKIE_SAME_SITE=none
WEBUI_AUTH_COOKIE_SECURE=true
WEBUI_SESSION_COOKIE_SAME_SITE=none
WEBUI_SESSION_COOKIE_SECURE=true
```

该方案仍可能被 Chrome、Edge 或企业浏览器策略的“阻止第三方 Cookie”功能拦截，因此不能视为长期彻底方案。`SameSite=None` 必须与 `Secure=true` 和可信 HTTPS 证书同时使用。

## 7. sessionId 接入要求

如果外层系统需要使用 `sessionId` 自动登录，必须由服务端完成验证和交换：

```text
一次性 sessionId/code
  → 服务端调用原系统验证接口
  → 获取稳定用户标识、邮箱、姓名、组和角色
  → 查找或创建 Open WebUI 用户
  → 由 Open WebUI 生成 JWT
  → 向浏览器设置 HttpOnly token Cookie
  → 重定向到不带 code 的 WebUI 地址
```

要求：

- 使用短期、一次性 code，不在 URL 中传递长期 JWT。
- 后端验证签名或调用权威会话服务，前端只解码不算认证。
- 对签发方、受众、有效期和重放进行校验。
- 用户角色和用户组必须由服务端可信数据决定，不能接受浏览器直接提交。
- 登录交换后移除 URL 中的 code，避免进入历史、代理日志和 Referer。

当前 WebUI 已支持可信请求头登录：

```env
WEBUI_AUTH_TRUSTED_EMAIL_HEADER=X-Auth-Email
WEBUI_AUTH_TRUSTED_NAME_HEADER=X-Auth-Name
WEBUI_AUTH_TRUSTED_GROUPS_HEADER=X-Auth-Groups
WEBUI_AUTH_TRUSTED_ROLE_HEADER=X-Auth-Role
```

使用可信请求头时，必须由网关删除客户端伪造的同名请求头，再注入服务端验证后的值；WebUI 原始端口也应限制为仅网关可访问。

## 8. 不能作为彻底方案的做法

### 8.1 取消资源接口鉴权

移除 `get_verified_user` 可以让资源立即显示，但会使头像、文件和知识库附件绕过访问控制，不建议使用。

### 8.2 在 URL 中传递长期 Token

```text
/api/v1/files/{id}/content?token=<长期JWT>
```

Token 可能进入浏览器历史、Nginx 日志、监控系统和 Referer，禁止使用。

### 8.3 只给头像改 Blob URL

通过带 Bearer Token 的 `fetch` 获取图片并转换 Blob URL，可以解决头像，但不能自动覆盖未来新增接口、HTML iframe、新窗口下载和大文件 Range 请求。适合作为局部补丁，不适合作为整体架构方案。

### 8.4 只添加 `crossorigin="use-credentials"`

该属性不会添加 Bearer Token，也不能绕过浏览器第三方 Cookie策略；还可能引入额外 CORS 要求。

## 9. 上线验证清单

### 9.1 Cookie

在浏览器开发者工具 Application/Cookies 中确认：

- 存在名为 `token` 的 Cookie。
- Domain 与正式 WebUI 地址匹配。
- Path 为 `/`。
- SameSite 为 `Lax`（同站部署）或临时使用的 `None`。
- Secure 为启用状态。

### 9.2 Network

检查以下请求的 Request Headers 包含：

```http
Cookie: token=...
```

并确认返回码为 `200`、`206` 或业务允许的 `302`，而不是 `401`：

```text
/api/v1/users/{id}/profile/image
/api/v1/models/model/profile/image?id=...
/api/v1/channels/webhooks/{id}/profile/image
/api/v1/files/{id}/content
```

### 9.3 功能回归

- 刷新 iframe 后登录状态仍然存在。
- 用户、模型和 Webhook 头像正常。
- 上传图片正常预览。
- 音视频能够播放和拖动进度。
- PDF、DOCX、PPTX 能够预览。
- 知识库引用和文件下载正常。
- 聊天流式响应和 WebSocket 正常。
- 如果使用 OAuth/OIDC，登录、回调和退出正常。

## 10. 回退

Cookie 配置修改本身不改变数据库或用户权限。需要回退时可以恢复原环境变量并重启服务，但如果已经强制 HTTPS，不建议重新启用 HTTP Cookie。

如果上线后出现登录循环，优先检查：

1. 用户是否仍在使用旧 IP 或 HTTP 地址。
2. Nginx 是否保留 `Set-Cookie`。
3. 外层页面与 iframe 是否确实同站。
4. HTTPS 证书是否被客户端信任。
5. Cookie 是否在修改配置后通过重新登录完成更新。
