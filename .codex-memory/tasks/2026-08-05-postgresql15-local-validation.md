# PostgreSQL 15 本地兼容验证

Tags: #task #verification

Date: 2026-08-05
Scope: global
Status: completed

## Goal

- 将本地 Compose 数据库从 PostgreSQL 17 切换到 PostgreSQL 15，并验证当前后端可完成迁移和正常提供接口。

## Work Summary

- `docker-compose.yaml` 使用 `postgres:15-alpine`。
- PostgreSQL 15 使用独立的 `postgres15` 命名卷，保留已有 PostgreSQL 17 数据卷，避免跨主版本直接挂载数据目录。
- 拉取并启动 PostgreSQL 15.18，随后启动本地后端完成全量 Alembic 迁移。

## Files Or Areas

- `docker-compose.yaml`
- `.env.example`

## Decisions And Learnings

- PostgreSQL 主版本数据目录不可直接降级复用；现有 `open-webui_postgres` 卷保留，新环境使用 `open-webui_postgres15`。
- PG15 可运行当前全部 Alembic 迁移，无需修改业务模型或迁移脚本。

## Verification

- `docker compose config --quiet`：通过。
- PostgreSQL：15.18，健康检查通过，临时表写入及读取成功。
- Alembic：升级到 `f0bd01a18a3d`，public schema 共 43 张表。
- HTTP：`/health`、`/`、`/api/config` 均返回 200；后端日志无 error/Traceback。
- 测试结束后已关闭后端与 PostgreSQL，8080、5432 均无监听。

## Next Steps

- 后续启动使用 `docker compose up -d postgres`；如需迁移 PostgreSQL 17 旧数据，应使用 `pg_dump`/`pg_restore`，不要直接复用旧卷。
