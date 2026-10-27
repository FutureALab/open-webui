# 离线文档预览与用户导入

## 文档资源

PDF 正文、缩略图和引用预览共用本地 PDF.js legacy 运行时及 Worker，以兼容 Chrome 108。公共加载入口同时补齐 Chrome 108 缺失的 ReadableStream 异步迭代器，支持正文提取、文本选择和批注处理。构建会从已安装的 `pdfjs-dist` 复制以下目录到 `build/pdfjs/`：

- `cmaps/`：中文等 CID 字体的字符映射。
- `standard_fonts/`：PDF 标准字体。
- `wasm/`：JPEG2000、JBIG2 和颜色转换解码器，以及 JavaScript 回退文件。
- `iccs/`：CMYK 色彩配置。
- `LICENSE` 及各目录自带的许可文件。

资源版本跟随锁文件中的 PDF.js 版本，不使用 CDN。完整分发 `build/` 即可；Docker 构建会按既有流程打包这些文件。开发服务也由相同的 Vite 静态复制插件提供资源。

应用内文件读取使用 `/files/{id}/content/preview.data`，以 `application/octet-stream` 和通用 `preview.data` 文件名传输，避免下载管理器把 PDF/Office 预览拦截成下载。Blob 调用方通过 `X-Original-Content-Type` 恢复原始 MIME 类型；鉴权与原始下载接口保持既有行为。独立预览路径也避免命中下载管理器对原 `/content` URL 的历史缓存；`/content?preview=true` 保留兼容。

Word、PowerPoint、Excel 使用项目已安装的解析器和文件内嵌资源。文档自身引用的远程图片、网页或在线服务仍需对应地址可达。

联网准备依赖后构建：

```powershell
npm install --engine-strict=false
npm run build
```

完整构建保留既有 Pyodide 0.28.x、本地 wheel 缓存和 `python_stdlib.data` 别名；生产部署须保留构建目录内的 `pyodide/`。普通构建会校验已提交的加密产物，不需要现场编译 Rust。

## CSV 用户导入

沿用四列模板：`Name,Email,Password,Role`，第一行为表头。

- 已有邮箱忽略大小写并跳过；同一文件内重复邮箱保留第一行，后续行计入跳过数。
- 无效行单独报错，后续批次继续处理。
- CSV 的 `pending` 和 `user` 角色均导入为可用的普通用户；`admin` 保留管理员角色。手动创建用户仍支持待审核角色。
- 既有用户的名称、密码和角色不被覆盖。
- 用户资料与有效登录凭据在同一事务内写入，失败时整体回滚。
- 导入完成分别提示新增和跳过数量；网络或服务器错误不计作成功或已有用户。

管理员导入通过 `/api/v1/auths/add?skip_existing=true` 请求跳过重复账户，跳过时返回 `null`。普通 `/auths/add` 仍对重复邮箱返回错误。

## 本机 Windows 运行环境

本次已将 `.venv` 的基础解释器切换为独立 CPython 3.11.15，保留已安装的依赖和 PyTorch 2.8.0+cpu。原 Anaconda 3.11.5 会优先加载其目录中的旧版 `MSVCP140.dll`，使 Chroma 向量写入发生原生访问冲突；独立运行时的向量写入、查询和知识库创建已通过验证。

## 2026-10-28 验收

- 29 项前端测试和 4 项后端测试通过；生产构建、加密产物与冻结锁文件校验通过。
- Chromium 108 与 156 在屏蔽外网后显示中文 PDF、缩略图和 JPEG2000 图片；Chrome 108 的 Word/PPT 内嵌内容与 PDF 缩放通过。
- CSV 实际新增 26 个用户、跳过 3 个重复用户，无效行后的用户正常导入；新增用户逐一登录成功。
- 本机通过既有 Windows 启动脚本运行 AIOps 0.12.4：`http://localhost:8080`。
