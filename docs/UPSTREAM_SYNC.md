# 上游同步与自定义开发

## 分支用途

- `upstream`：`https://github.com/open-webui/open-webui.git`，官方代码来源。
- `origin`：`https://github.com/FutureALab/open-webui.git`，团队仓库。
- `main`：接收官方 `upstream/main` 更新，保留团队已有的 Docker 构建配置；业务改造放在 feature。
- `feature_20260730_dev`：AIOps 自定义开发和本地运行分支。

## 后续同步

先提交本地修改，获取双方远程状态并创建备份。先将 `origin/main` 快进合入本地 main，再合并 `upstream/main`；随后在 feature 汇合 `origin/feature_20260730_dev`，最后合并本地 main。

```powershell
git fetch origin
git fetch upstream main
git branch backup/feature-before-sync-YYYYMMDD feature_20260730_dev
git branch backup/main-before-sync-YYYYMMDD main
git switch main
git merge --ff-only origin/main
git merge --no-ff upstream/main
git switch feature_20260730_dev
git merge origin/feature_20260730_dev
git merge --no-ff main
```

发生冲突时，保留官方新功能结构，逐项适配 AIOps 白标、中文设置、字体/字号、Chrome 108、Pyodide 标准库别名、Claude Pipe、S3/Qdrant 和 Windows/PostgreSQL 启动逻辑。不要直接覆盖整份文件，也不要强制推送。

```powershell
npm install --engine-strict=false
pnpm import --config.engine-strict=false
npm run test:frontend -- --run official-style-parity.test.js settings-localization.test.js pyodide-runtime.test.js postcss-chrome109-fix.test.js src/lib/utils/marked/svg-extension.test.ts
node --max-old-space-size=8192 node_modules/vite/bin/vite.js build
git push --atomic origin main feature_20260730_dev
```

本机 Node 24 超出项目声明的 Node 22 上限，`--engine-strict=false` 仅为命令级兼容选项；不修改 npm 缓存、prefix 或系统环境。生产构建前运行 `npm run pyodide:fetch`，确认资源完整。正式环境优先使用项目声明的 Node 版本。

## 2026-10-14 同步

- 官方 main：`f8ae8a6c328946dc62cd0712961a0632574581bf`，版本 `0.12.0`。
- Fork main 同步提交：`ce56d8e0c`；保留原有 Dockerfile 和镜像构建工作流差异。
- 先汇合远程 feature 的更新和本地 4 个独有提交，汇合提交为 `7157c0f7f`。
- 最新 main 合入 feature 时解决 55 个文件、82 个冲突块。
- 原有中文内容迁移到新版 `settings.*` 语义键；恢复 Archivo 主字体、设置/账户菜单字号、48px 模型头像和禁用更新公告的行为。
- 保留 Pyodide 0.28.x、实际运行时 0.28.3、`python_stdlib.data` 别名、离线缓存；支持上游新加入的 Office 和 seaborn wheel。
- 新版文件对比组件补齐 Chrome 108 颜色回退；保留上游新增的 MFA、群组层级、模型/插件历史和构建渠道信息。
- 现有 SQLite 数据库迁移前备份到 `backend/data/webui.db.backup-20261014-before-upstream-sync`；密钥与账户配置未写入 Git。
- 本地生产页面：`http://localhost:8080`，沿用现有账户登录。
- feature 适配合并提交：`1c40046fb`；main 与 feature 已用普通原子 push 更新到 origin。
- 验证：13 项回归测试、最终生产构建、pnpm 冻结锁文件、23 个品牌资源哈希、Pyodide 运行与 Excel 生成通过；最终 CSS 不兼容颜色声明为 0。
