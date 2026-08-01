# Pyodide IDM 拦截修复与界面收尾

- 日期：2026-08-01
- 状态：已完成
- 分支：`feature_20260730_dev`

## 目标

- 修复本地 Pyodide 代码执行持续返回 `Program terminated with exit(1)`。
- 移除更新公告弹窗的前端展示链路。
- 放大侧栏品牌图标和聊天首页模型头像。

## 根因与决策

- 浏览器网络日志显示 IDM Advanced Integration 将 `/pyodide/python_stdlib.zip` 请求拦截并返回 204；Pyodide 随后因缺少标准库而无法导入 `encodings`。
- 保留原始 zip，并在资源准备阶段复制为 `python_stdlib.data`；运行时通过 `stdLibURL` 显式加载 `.data`。该资源内容不变，但不会触发 IDM 的压缩包接管规则。
- Pyodide 版本一致性以 `node_modules/pyodide/package.json` 的实际安装版本为准，不再直接比较根依赖中的 semver 范围。
- 更新公告源码组件虽未被当前入口引用，仍删除组件、状态和前端请求函数，防止后续构建重新接入；后端兼容端点不做无关清理。

## 修改

- `src/lib/pyodide/pyodideSandboxHost.ts` 与 `src/lib/workers/pyodide.worker.ts`：指定 `.data` 标准库。
- `scripts/prepare-pyodide.js`：生成 `.data` 资源并修正版本比较。
- 删除 `src/lib/components/ChangelogModal.svelte`，移除相关 store 与前端 API。
- 调整 `Sidebar.svelte`、`Placeholder.svelte` 和 `ChatPlaceholder.svelte` 的头像尺寸。
- 新增 Pyodide/公告回归测试并扩充官方样式测试。

## 验证

- `vitest` 定向测试：3 个文件、9 项全部通过。
- `vite build`：成功。
- 隔离 Playwright 浏览器：`/pyodide/python_stdlib.data` 返回 200，最小 Python 探针输出 `hello`，控制台 0 错误。

## 后续尺寸调整

- 用户确认后要求两个品牌图标继续放大：侧栏图标调整为 28px，聊天首页模型头像调整为 48px。
- 样式回归测试 4/4 通过，生产构建成功。
