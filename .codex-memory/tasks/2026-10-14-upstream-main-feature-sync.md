# Task: 同步官方 main 并保留 feature 改造

Tags: #task #merge #verification

Date: 2026-10-14
Scope: global
Status: active

## Goal

- 固定上游 → main → feature 的同步流程，保留 AIOps 自定义行为，并本地启动供用户查看。

## Work Summary

- 官方最新 main 为 `f8ae8a6c328946dc62cd0712961a0632574581bf`，版本 0.12.0；Fork main 为 `ce56d8e0c`。
- 远程 feature 与本地 4 个独有提交通过 `7157c0f7f` 汇合，随后合并本地 main，解决 55 个文件、82 个冲突块。
- 保留新版功能结构，恢复上一轮远程同步覆盖的 Archivo 字体、界面密度、中文设置、Pyodide 缓存和禁用公告/推广入口行为。
- 迁移 435 个设置语义键的旧中文内容，保留 644 个此前修改或新增的非空中文条目，并补齐本轮设置缺失翻译。
- Pyodide 0.28.3 的完整缓存、标准库别名以及新增 Office/seaborn wheel 已准备。
- `pnpm-lock.yaml` 从更新后的 npm 锁文件生成，保持现有 pnpm 构建支持。
- SQLite 已备份，使用原有数据密钥和 Selector 事件循环启动 8080 后端；自动迁移到 `b8f2c6d91a04`。

## Verification

- 定向 Vitest：13/13 通过。
- 改造相关 Svelte：155 个文件语法通过；Python：7 个文件语法通过。
- 首次生产构建成功，6431 个浏览器模块；发现文件对比暗色样式的两处现代颜色声明，已补齐回退，待最终构建确认。
- Pyodide：完整资源检查通过，实际安装版本和静态缓存均为 0.28.3。
- `/health`：200，`/api/config`：AIOps 0.12.0。
- 登录页面已在 Codex 浏览器打开，沿用现有账户，不创建新用户。

## Decisions And Learnings

- 同步前必须获取 origin/upstream；本地 tracking ref 可能落后于远程。
- 普通 merge 保留双方提交，禁止 force push。
- Git 部分克隆的缺失 blob 可通过批量 `fetch --refetch --no-filter --stdin` 获取；本机 GitHub TLS 连接使用命令级 `http.sslBackend=schannel`、`http.version=HTTP/1.1`。
- 默认 PyPI 网络不稳定，本地依赖通过可达镜像补齐；不改全局 npm 配置。
- 本机 Torch 2.8 CPU 保留；仅更新上游本轮变化的依赖并补齐 MFA、RE2、Claude SDK。
- 现有 Open Terminal 配置指向 127.0.0.1:8000，该外部服务未运行，不影响 WebUI 启动。

## Next Steps

- 完成最终构建与页面检查、提交并普通 push main/feature，更新本任务为 completed。
- 详细流程：`docs/UPSTREAM_SYNC.md`。
