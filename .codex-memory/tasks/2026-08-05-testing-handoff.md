# Task: 2026-08-04 至 2026-08-05 测试交接

Tags: #task #handoff #verification

Date: 2026-08-05
Scope: global
Status: completed

## Goal

- 将两天内完成的本地集成、Chrome 108、PDF 和 embedding/Qdrant 排查结果整理为可接手文档。

## Work Summary

- 新增 `docs/TEST_HANDOFF_2026-08-04_TO_2026-08-05.md`。
- 汇总 PostgreSQL 15、Redis、MinIO、Qdrant 和 Playwright Chromium 108 验证结果。
- 记录 `text-embedding-v4` 合成语料实测：默认 1024 维、5/5 Top-1、MRR 1.0。
- 记录当前 Qdrant 风险：文件物理集合混入 v4 与 qwen3.7 向量，知识物理集合为空但维度为 3。
- 区分按名称/元数据读取知识文件与 `query_knowledge_files` 语义向量检索。
- 未记录任何 API Key、Token、密码或完整敏感日志。

## Files Or Areas

- `docs/TEST_HANDOFF_2026-08-04_TO_2026-08-05.md`
- `.codex-memory/tasks/2026-08-05-testing-handoff.md`

## Decisions And Learnings

- embedding 模型切换后必须统一重建相关物理集合并全量重新索引。
- 同维度不等于同向量空间，v4 与 qwen3.7 向量不能混合检索。
- OpenAI-compatible 路径没有使用百炼原生 `text_type`；需要该能力时应增加专用适配。
- 外部 embedding 质量测试使用合成语料，未经授权不发送本地知识文件正文。

## Verification

- 文档内容与本地代码、Git 提交、Qdrant 只读检查和接口实测结果交叉核对。
- 执行敏感信息扫描、Markdown 链接检查和目标文件差异检查。

## Next Steps

- 轮换通过聊天传递过的百炼凭据。
- 备份后选择单一 embedding 模型、重建物理集合并使用固定问题集验证 `query_knowledge_files`。
