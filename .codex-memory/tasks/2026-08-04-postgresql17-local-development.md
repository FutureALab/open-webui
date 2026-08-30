# Task: PostgreSQL 17 本地开发启动

Tags: #task #verification

Date: 2026-08-04
Scope: global
Status: completed

## Goal

- 拉取远程变更，将本地开发数据库切换为 Docker PostgreSQL 17，并验证本地前后端正常启动。

## Work Summary

- 远程分支已经是最新状态。
- Docker 仅负责运行 `postgres:17-alpine`；本地 Python 后端从根目录 `.env` 连接 `localhost:5432`。
- Compose 同时保留容器化应用连接 `postgres:5432` 的配置。
- Windows 启动脚本使用 Selector 事件循环运行 Uvicorn，兼容 psycopg v3 异步连接。

## Files Or Areas

- `docker-compose.yaml`
- `.env.example`
- `backend/start_windows.bat`
- 本地忽略文件 `.env`

## Decisions And Learnings

- Windows 上直接执行 Uvicorn CLI 会先创建 ProactorEventLoop；psycopg v3 异步连接要求 SelectorEventLoop，因此必须在 Uvicorn 建立循环前设置策略。
- 本地数据库数据保存在 Compose 命名卷 `postgres` 中，停止容器不会删除数据。

## Verification

- Command: `docker compose config --quiet`
- Result: 通过。
- Command: PostgreSQL 版本、Alembic 版本及 public 表数量查询。
- Result: PostgreSQL 17.10，Alembic `f0bd01a18a3d`，43 张表。
- Command: `backend\start_windows.bat`、`npm run dev` 及 HTTP 检查。
- Result: `/health`、Vite 首页、`/api/config` 均返回 200，CORS 正常。
- Command: 测试结束后的 5173、8080、5432 监听检查。
- Result: 无测试监听器。

## Next Steps

- 日常启动依次执行 `docker compose up -d postgres`、`backend\start_windows.bat` 和 `npm run dev`。
