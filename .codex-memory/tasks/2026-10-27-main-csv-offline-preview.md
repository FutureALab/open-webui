# 2026-10-27 main 同步、CSV 导入与离线预览

Tags: #task

状态：进行中。

- 目标：将 origin/main@770cf9f4a 合入 feature_20260730_dev，修复 CSV 重复用户与离线文档预览，验证本地启动后推送。
- 起点：本地 284ad08e5；远程 feature 1962b16ed；备份 backup/feature-before-sync-20261027。
- 保留：AIOps 品牌、中文、Chrome 108、Pyodide 0.28.x/.data、Windows 与数据库适配。
- GitHub：现有 7890 代理未监听，单次 git -c http.proxy= -c https.proxy= 直连成功，未更改全局配置。
- 合并冲突采用上游功能结构，重应用已有字体、字号和禁用社区/更新入口。

下一步：完成依赖锁文件、定向回归与运行验证。
