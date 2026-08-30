# 进度

## 2026-08-30 上游提交与 iframe 鉴权文档

- 新增 `docs/UPSTREAM_MAIN_SYNC_2026-08-30.md`，记录 460 个上游提交、合并/依赖提交、主要模块变化、私有化语义保留、验证和回退点。
- 新增 `docs/IFRAME_AUTH_AND_RESOURCE_ACCESS.md`，记录 iframe 中 Bearer/Cookie 差异、已确认受影响的资源接口、同源/同站 Nginx部署、Cookie配置、sessionId 交换要求和上线验证。
- 文档结论以当前 Git 历史和代码实现为准，不包含真实 Token、Cookie、账号或证书路径。

## 2026-07-31

- 完成项目架构梳理与启动文档。
- 完成 Python/Node 依赖安装和 Pyodide 资源准备。
- 使用 PyTorch `2.8.0+cpu` 解决锁定新版在本机的 DLL 加载失败。
- 完成 AIOps 名称、Logo、PWA/搜索描述和主要页面白标。
- 关闭社区分享、上游版本检查及推广入口。
- 修复首次引导视频卸载后的空对象 `play()` 调用。
- 使用 Chromium 108 验证注册、登录、首页、系统设置、用户管理和工作区。

## 2026-07-31 交接

- 新增 `docs/UPDATE_HANDOFF_2026-07-31.md`，记录白标范围、运行环境、构建启动、验收、限制和后续建议。
- 准备将 `feature_20260730_dev` 推送到 `origin`。

## 2026-07-31 Chrome 108 视觉兼容补充

- 定位到 Chromium 108 不支持 `color-mix(in oklab, ...)`，导致现代颜色声明整体失效；在构建阶段生成等价的 RGB/RGBA 回退，并将支持范围固定到 Chrome 108 及以上。
- 加强浅色主题的登录、设置、文件夹创建等输入框和展示区域边界，保持现有设计语言不变。
- 增加 Markdown SVG 块解析与现有安全 SVG 查看器的渲染衔接，修复 SVG 源码直接显示的问题。
- 补充设置页常见英文标签及说明的简体中文翻译。
- 使用相同视口实测 Chrome 108.0.5359.29 与 Chrome 149：关键计算样式一致，页面视觉结果一致；Chrome 149 中设置页和 SVG 图表均通过视觉检查。
- 定向 Vitest 共 4 项通过；8 GB Node 堆配置下生产构建成功，产物 CSS 不再包含 `color-mix`、`oklab`、`oklch` 或 `display-p3`。

## 2026-08-01 官方镜像视觉对齐

- 以 `http://localhost:3010/` 官方镜像为基准，使用 Chromium 108.0.5359.29、1600×900、浅色主题采集同状态截图和计算样式。
- 恢复官方 `Archivo` 可变字体、`.font-primary` 字体栈和登录页 `font-medium` 层级。
- 登录页表单、密码控件与按钮恢复官方尺寸和轻量样式；AIOps 名称与 Logo 保持不变。
- 设置页通用输入框、选择框和文件夹弹窗恢复官方弱边框/透明控件视觉，继续依赖构建期 RGB/RGBA 回退支持 Chrome 108。
- 最终实测无页面脚本错误；登录卡片坐标和尺寸为 `(576, 321.5, 448, 257)`，与官方完全一致。
- 定向 Vitest 3/3 通过；生产构建成功；产物 CSS 中旧版 Chrome 不支持的 `color-mix`、`oklab`、`oklch`、`display-p3` 计数为 0。

## 2026-08-01 官方字体与特效全站补齐

- 以官方历史源码为基线，仅在非字体内容仍完全一致的行上恢复 `font-medium`、`font-semibold` 和 `font-primary`，补齐聊天、管理、工作区、笔记等页面被扁平化的文字层级。
- 聊天侧边栏、占位页、消息操作区和输入框恢复 Archivo 主字体与官方前景色；Markdown 标题恢复半粗体。
- 设置页按用户要求保留现有框架，仅恢复标签字重、弱底色输入框和 emerald 绿色开关效果；当前简体中文翻译覆盖可见功能说明。
- 新增 `official-style-parity.test.js`；与 Chrome 108 颜色回退测试合计 6/6 通过，生产构建成功，产物中不兼容颜色函数计数为 0。
- 使用 Chromium 108.0.5359.29 在 2048×968、DPR 1、浅色主题下完成已登录空白聊天、模拟 GDP 对话和管理员通用设置页截图；输入聚焦、侧栏展开、设置导航和开关往返均通过，无页面错误或失败请求。
- 视觉证据位于 `official-style-qa-20260801`，验收记录见仓库根目录 `design-qa.md`，最终结果为 passed。

## 2026-08-01 官方界面字号与密度优化

- 对照官方 2048×968 首页、账户菜单裁剪图及设置页截图，确认主要差距来自默认侧栏 245px、设置项 12px、账户菜单 12–13px 和首页标题/建议层级偏小。
- 默认侧栏改为 260px，并仅将本地存储中的旧默认值 245px 迁移为 260px；主导航及聊天标题提升到 15px。
- 账户菜单增加大头像、姓名/在线双层身份区，菜单行统一为 14px/36px，并增强浅色主题前景对比度。
- 设置导航、用户设置和管理员设置共用行/字段提升到 14px；说明文字调整为 12px 并增强可读性。
- 首页模型标题提升到 28px、建议标题提升到 16px；输入框位置和现有布局保持不变。
- 定向 Vitest 7/7 通过；生产构建成功；生成 CSS 中 `color-mix`、`oklab`、`oklch`、`display-p3` 计数均为 0。
- Chromium 108.0.5359.29 在 2048×968 与 1366×768 下完成最终验证：无横向溢出，账户菜单和设置弹窗完整位于视口内，控制台/page error 为 0；`design-qa.md` 最终结果为 passed。

## 2026-08-01 设置字体规范化与中文审计

- 修复账户菜单上下分组字号不一致：通过 `DropdownMenu` 非紧凑模式将所有操作项统一为 15px/20px。
- 设置面板统一为 16px 标题、14px 功能标签、13px 说明文字，并提高浅色主题帮助文字的对比度。
- 扫描全部用户及管理员设置组件，补齐 555 个缺失或空白简体中文翻译；变量占位符检查为 0 个不一致。
- 新增 `settings-localization.test.js`，自动验证所有设置组件使用的本地化键都有非空中文值，并覆盖关键集成名称。
- Chromium 108.0.5359.29 在 2048×1225 下完成账户菜单与管理员扩展功能面板复拍：菜单计算字号全部为 15px/20px，设置层级为 16/14/13px，可见纯英文项为 0，控制台错误与横向溢出均为 0。
- 定向 Vitest 9/9 通过，生产构建成功；`design-qa.md` 最终结果为 passed。

## 2026-08-01 Pyodide IDM 拦截修复与界面收尾

- 定位到 IDM 浏览器扩展将 `/pyodide/python_stdlib.zip` 拦截为下载并向页面返回 204，造成 Pyodide 无法导入 `encodings`，所有代码执行以 `exit(1)` 结束。
- Pyodide 沙盒和 Worker 显式加载 `/pyodide/python_stdlib.data`；准备脚本从原始 zip 生成等内容的 `.data` 资源，绕过下载管理器的扩展名规则。
- 准备脚本改为读取 `node_modules/pyodide/package.json` 的实际版本，避免 `^0.28.2` 与已安装 `0.28.3` 被误判为版本不一致。
- 删除未被当前入口引用的更新公告弹窗组件、前端状态及请求函数；后端兼容 API 保留。
- 侧栏品牌图标从 20px 放大到 24px，聊天首页模型头像从 36/40px 放大到 40/44px，备用占位头像放大到 48px。
- 定向 Vitest 9/9 通过，生产构建成功；隔离浏览器请求 `python_stdlib.data` 返回 200，Python 实跑输出 `hello`，控制台错误为 0。
- 根据用户二次反馈，侧栏品牌图标继续放大到 28px，聊天首页模型头像统一为 48px；样式测试 4/4 通过，生产构建成功。

## 2026-08-01 跨平台合并冲突解决

- 合并远程“添加 HTTP proxy 来完成交叉编译”提交；`postcss-chrome109-fix.cjs` 按用户要求完整保留本地 Chrome 108/109 兼容实现。
- `prepare-pyodide.js` 采用远程跨平台实现：实际版本缓存校验、可选标准代理环境变量、PyPI wheel 缓存及 lock 条目恢复。
- 移除公共运行时中的 `.data` 标准库覆盖，恢复 Pyodide 默认资源加载；同步更新回归测试。
- 定向 Vitest 9/9 通过；Pyodide 准备命中 0.28.3 有效缓存且无网络操作；生产构建成功；后端在独立 18080 端口启动并通过 `/health` 检查。

## 2026-08-01 通用 Pyodide 标准库资源别名

- 根据用户最终决策恢复 `python_stdlib.data`，实现保持通用：准备脚本将官方 `python_stdlib.zip` 原样复制为静态别名，不包含下载管理器、浏览器扩展或单机路径配置。
- 沙盒主线程和 Worker 均通过 Pyodide 官方 `stdLibURL` 参数加载该别名；原始 zip 继续保留，支持 Windows 与 Linux 的同一构建产物及离线部署。
- 定向 Vitest 3 个文件、9 项全部通过；资源准备命中 Pyodide 0.28.3 本地缓存，zip 与 data 的 SHA-256 完全一致。
- 默认 Node 堆下构建因约 4 GB 内存上限退出，改用 8 GB Node 堆后生产构建成功；属于构建环境内存限制，不是代码错误。
- 本地服务在 `127.0.0.1:8080` 启动并通过 `/health`；真实浏览器中 Python 输出 `hello`，`/pyodide/python_stdlib.data` 返回 200，控制台错误为 0，未请求 `python_stdlib.zip`。

## 2026-08-30 同步原始仓库 main

- 确认 Fork 的 `origin/main` 停留在 `01f4282f1ffe0d6212f58d3afbeae21fffd0c4be`；新增 `upstream` 并以原始仓库最新 `d3e8bf3405e848cfba377814d0aa7ba7290e414d` 为合并目标，共引入 460 个上游提交。
- 在同步前提交 `33aaa43df163b3f0da08d750a9af179bc317f027` 创建同名备份分支与标签 `backup/feature-before-main-sync-20260830`，在 `integration/main-d3e8bf3-20260830` 处理合并。
- 冲突以上游新结构为基线，重新应用 AIOps 名称、私有 Logo/字体资源、15px 侧栏与账户菜单、绿色开关、Chrome 108 PostCSS、中文设置、移除 Changelog 前端入口及社区/文档推广入口等 feature 语义。
- 保留上游新增默认界面设置等功能，并保持 Pyodide `^0.28.2`、实际缓存 0.28.3 和 `python_stdlib.data` 别名流程。
- 自定义 Vitest 4 文件 11 项全部通过；`env.py`/`main.py` 语法通过；20 项 Logo、PWA、启动图和 Archivo 字体哈希均与备份 feature 一致；无未解决冲突或冲突标记。
- `npm run build` 编译 672 个模块后仅因当前 `node_modules` 缺少上游新增 `docx-preview` 停止；npm 镜像与官方 registry 均连接失败，完整依赖刷新留待网络恢复。

## 2026-08-30 依赖刷新与最终构建验证

- 网络恢复后执行 `npm install --engine-strict=false`，补齐上游新增的 `docx-preview@0.4.0`，并由 npm 将手工合并的 PostCSS 锁图规范化为完整依赖关系。
- 本机仅有 Node 24.13.0，而项目 engines 上限为 22.x；未修改系统配置或持久 npm 配置，仅对本次安装绕过 engine 检查。
- 私有化定向 Vitest 4 文件 11 项全部通过，后端 `env.py` 与 `main.py` 语法检查通过。
- 全量 `npm run check` 报告 7747 个错误、201 个警告，仍集中于仓库既有的 JS 隐式 `any` 与 Svelte `i18n` 类型推断，数量与依赖刷新前基本一致。
- 默认约 4 GB Node 堆在 chunks 生成阶段内存不足；直接以 8 GB 堆运行 Vite 后成功转换 6346 个浏览器模块，静态产物写入 `build`。
