"""
title: Claude Code via OpenRouter
description: Run Claude Code's agent loop from inside OpenWebUI chats via subprocess.
             Supports any model available through OpenRouter, RouterAI, or any
             Anthropic API-compatible provider (DeepSeek, Qwen, Tencent, Anthropic, etc).
             Features real-time text streaming, session resume across model switches,
             thinking blocks, graceful cancellation, and artifact uploads.
             Each chat gets its own isolated project directory.
author: Denis Kutuzov (aka R8CEH)
author_url: https://github.com/R8CEH
version: 0.1.3
license: MIT
requirements:
"""

import asyncio
import json
import logging
import mimetypes
import os
import re
import shutil
import time
import uuid
from pathlib import Path
from typing import Any, AsyncGenerator, Callable, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}
_DOWNLOAD_EXTENSIONS = {
    ".pdf", ".csv", ".tsv", ".txt", ".md", ".json", ".yaml", ".yml",
    ".html", ".xml", ".xlsx", ".docx", ".pptx", ".zip",
    ".py", ".js", ".ts", ".sh", ".rs", ".go", ".cpp", ".c", ".h",
}
_ARTIFACT_EXTENSIONS = _IMAGE_EXTENSIONS | _DOWNLOAD_EXTENSIONS
_MAX_ARTIFACT_BYTES = 50 * 1024 * 1024  # 50 MiB

_EXT_TO_LANG = {
    ".py": "python", ".js": "javascript", ".ts": "typescript",
    ".sh": "bash", ".rs": "rust", ".go": "go", ".c": "c", ".cpp": "cpp",
    ".h": "c", ".json": "json", ".yaml": "yaml", ".yml": "yaml",
    ".html": "html", ".css": "css", ".md": "markdown", ".sql": "sql",
    ".toml": "toml", ".xml": "xml",
}

# company slug → display name
_COMPANY_MAP = {
    "anthropic": "Anthropic", "openai": "OpenAI", "deepseek": "DeepSeek",
    "qwen": "Qwen", "google": "Google", "x-ai": "xAI", "z-ai": "Z.ai",
    "minimax": "MiniMax", "moonshotai": "Moonshot", "tencent": "Tencent",
    "xiaomi": "Xiaomi", "mistralai": "Mistral", "meta-llama": "Meta",
    "cohere": "Cohere", "nvidia": "NVIDIA", "microsoft": "Microsoft",
}

# model token → display label
_TIER_MAP = {
    "flash": "Flash", "pro": "Pro", "max": "Max", "plus": "Plus",
    "mini": "Mini", "nano": "Nano", "turbo": "Turbo", "fast": "Fast",
    "preview": "Preview", "next": "Next", "latest": "Latest",
    "sonnet": "Sonnet", "opus": "Opus", "haiku": "Haiku",
}

# Claude Code tool names → icons
_TOOL_ICON = {
    "bash": "💻", "write": "✏️", "edit": "✏️", "read": "📖",
    "glob": "🔍", "grep": "🔍", "websearch": "🌐", "webfetch": "🌐",
    "agent": "🤖", "todowrite": "📋", "exitplanmode": "🎯",
    "askuserquestion": "❓", "toolsearch": "🔧", "enterplanmode": "📋",
}

# Tool labels by language
_TOOL_LABEL: Dict[str, Dict[str, str]] = {
    "ru": {
        "bash": "Выполнение команды",
        "write": "Запись файла",
        "edit": "Редактирование файла",
        "read": "Чтение файла",
        "glob": "Поиск файлов",
        "grep": "Поиск в файлах",
        "websearch": "Поиск в интернете",
        "webfetch": "Загрузка страницы",
        "agent": "Подагент",
        "todowrite": "Список задач",
        "exitplanmode": "Выход из планирования",
        "enterplanmode": "Планирование",
        "askuserquestion": "Вопрос пользователю",
        "toolsearch": "Поиск инструмента",
    },
    "en": {
        "bash": "Run command",
        "write": "Write file",
        "edit": "Edit file",
        "read": "Read file",
        "glob": "Find files",
        "grep": "Search in files",
        "websearch": "Web search",
        "webfetch": "Fetch page",
        "agent": "Subagent",
        "todowrite": "Todo list",
        "exitplanmode": "Exit planning",
        "enterplanmode": "Planning",
        "askuserquestion": "Ask user",
        "toolsearch": "Tool search",
    },
}

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Chat state via OpenWebUI Chats API
# ---------------------------------------------------------------------------

async def _chats_call(method: str, *args):
    from open_webui.models.chats import Chats
    result = getattr(Chats, method)(*args)
    if asyncio.iscoroutine(result):
        return await result
    return result


async def _load_chat_state(chat_id: str) -> tuple:
    """Returns (session_id: str|None, workdir_name: str|None, model_id: str|None)"""
    try:
        chat = await _chats_call("get_chat_by_id", chat_id)
        if chat:
            meta = (chat.chat or {}).get("meta", {})
            return (
                meta.get("cc_session_id"),
                meta.get("cc_workdir"),
                meta.get("cc_model_id"),
            )
    except Exception as exc:
        log.warning("_load_chat_state failed: %s", exc)
    return None, None, None


async def _save_chat_state(
    chat_id: str,
    session_id: Optional[str],
    workdir_name: str,
    model_id: str = "",
) -> None:
    try:
        chat = await _chats_call("get_chat_by_id", chat_id)
        if chat:
            chat_data = dict(chat.chat or {})
            meta = dict(chat_data.get("meta", {}))
            meta["cc_session_id"] = session_id
            meta["cc_workdir"] = workdir_name
            meta["cc_model_id"] = model_id
            chat_data["meta"] = meta
            if "title" not in chat_data:
                chat_data["title"] = workdir_name
            await _chats_call("update_chat_by_id", chat_id, chat_data)
    except Exception as exc:
        log.warning("_save_chat_state failed: %s", exc)


# ---------------------------------------------------------------------------
# Helpers: model display name
# ---------------------------------------------------------------------------

def _model_display_name(model_id: str) -> str:
    """
    'company/model-name' → 'Company: Model Name (Code)'
    Examples:
      anthropic/claude-sonnet-4-6  → Anthropic: Claude Sonnet4.6 (Claude Code)
      deepseek/deepseek-v4-flash   → DeepSeek: Deepseek V4 Flash (Claude Code)
      tencent/hy3-preview          → Tencent: Hy3 Preview (Claude Code)
    """
    parts = model_id.split("/", 1)
    if len(parts) == 2:
        company_slug, model_slug = parts
    else:
        return f"{model_id} (Code)"

    company = _COMPANY_MAP.get(company_slug.lower(), company_slug.capitalize())
    tokens = model_slug.replace("_", "-").split("-")
    name_parts: List[str] = []
    for tok in tokens:
        if not tok:
            continue
        mapped = _TIER_MAP.get(tok.lower())
        if mapped:
            name_parts.append(mapped)
        elif re.match(r"^\d[\d\.]*$", tok):
            if name_parts:
                name_parts[-1] += tok
            else:
                name_parts.append(tok)
        else:
            name_parts.append(tok.capitalize())

    return f"{company}: {' '.join(name_parts)} (Claude Code)"


def _extract_model_id(raw_body_model: str) -> str:
    """OpenWebUI passes body["model"] as "<function_slug>.<model_id>"."""
    if "." in raw_body_model:
        return raw_body_model.split(".", 1)[1]
    return raw_body_model


# ---------------------------------------------------------------------------
# Helpers: project name from prompt
# ---------------------------------------------------------------------------

async def _project_name_from_prompt(
    prompt: str,
    event_emitter: Optional[Callable],
) -> str:
    version_match = re.search(r"\b([A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9\.]+)+)\b", prompt)
    if version_match:
        name = version_match.group(1)
    else:
        explicit = re.search(
            r'(?:назов[её]м|название|named?|call(?:\s+it)?|project)\s+["\']?'
            r'([A-Za-z0-9][A-Za-z0-9_\-]{1,30})["\']?',
            prompt, re.IGNORECASE,
        )
        if explicit:
            name = explicit.group(1)
        else:
            stop = {
                "the", "and", "for", "with", "from", "that", "this",
                "let", "make", "create", "write", "simple", "just", "please",
                "можешь", "напиши", "сделай", "создай",
            }
            words = re.findall(r"[A-Za-z]{3,}", prompt)
            meaningful = [w.capitalize() for w in words if w.lower() not in stop][:3]
            name = "_".join(meaningful) or "Project"

    if event_emitter:
        try:
            await event_emitter({"type": "chat:title", "data": {"title": name.replace("_", " ")}})
        except Exception:
            pass
    return name


# ---------------------------------------------------------------------------
# Helpers: artifacts
# ---------------------------------------------------------------------------

def _iter_artifact_files(scan_dirs: List[Path]) -> List[Path]:
    result = []
    for d in scan_dirs:
        if not d.exists():
            continue
        # rglob scans recursively — picks up files in subdirectories (src/, lib/, etc.)
        for path in d.rglob("*"):
            if (
                path.is_file()
                and path.suffix.lower() in _ARTIFACT_EXTENSIONS
                and not path.name.startswith(".")
                # skip hidden directories anywhere in the path
                and not any(part.startswith(".") for part in path.parts)
            ):
                result.append(path)
    return result


def _snapshot_artifacts(scan_dirs: List[Path]) -> Dict[str, int]:
    snapshot: Dict[str, int] = {}
    for path in _iter_artifact_files(scan_dirs):
        try:
            snapshot[str(path)] = path.stat().st_mtime_ns
        except OSError:
            pass
    return snapshot


async def _upload_new_artifacts(
    scan_dirs: List[Path],
    before: Dict[str, int],
    user_id: Optional[str],
) -> List[str]:
    if not user_id:
        return ["\n\n_(Can't save artifacts: no user context.)_\n"]
    try:
        from open_webui.models.files import FileForm, Files
        from open_webui.storage.provider import Storage
    except Exception as exc:
        return [f"\n\n_(File store unavailable: {exc})_\n"]

    chunks: List[str] = []
    for path in sorted(_iter_artifact_files(scan_dirs)):
        try:
            mtime = path.stat().st_mtime_ns
            size = path.stat().st_size
        except OSError:
            continue
        if before.get(str(path)) == mtime:
            continue
        if size > _MAX_ARTIFACT_BYTES:
            chunks.append(f"\n\n_(Skipped {path.name}: {size // 1024 // 1024} MiB exceeds limit.)_\n")
            continue

        ext = path.suffix.lower()
        is_image = ext in _IMAGE_EXTENSIONS
        mime = mimetypes.guess_type(path.name)[0] or ("image/png" if is_image else "application/octet-stream")
        file_id = str(uuid.uuid4())
        try:
            with path.open("rb") as handle:
                contents, storage_path = Storage.upload_file(
                    handle, f"{file_id}_{path.name}",
                    {"OpenWebUI-User-Id": user_id, "OpenWebUI-File-Id": file_id},
                )
        except Exception as exc:
            log.exception("Artifact upload failed: %s", path)
            chunks.append(f"\n\n_(Failed to save {path.name}: {exc})_\n")
            continue

        try:
            await Files.insert_new_file(
                user_id,
                FileForm(
                    id=file_id, filename=path.name, path=storage_path, data={},
                    meta={"name": path.name, "content_type": mime, "size": len(contents)},
                ),
            )
        except Exception as exc:
            log.warning("DB insert failed: %s -> %s", path.name, exc)
            chunks.append(f"\n\n_(Saved but not linkable: {path.name}: {exc})_\n")
            continue

        if is_image:
            chunks.append(f"\n\n![{path.name}](/api/v1/files/{file_id}/content)\n")
        else:
            if size < 1024:
                size_str = f"{size} B"
            elif size < 1024 * 1024:
                size_str = f"{size / 1024:.1f} KiB"
            else:
                size_str = f"{size / 1024 / 1024:.1f} MiB"
            chunks.append(f"\n\n📎 [{path.name}](/api/v1/files/{file_id}/content) · {size_str}\n")
    return chunks


# ---------------------------------------------------------------------------
# Helpers: message extraction
# ---------------------------------------------------------------------------

def _extract_latest_user_prompt(body: Dict[str, Any]) -> str:
    for msg in reversed(body.get("messages") or []):
        if msg.get("role") != "user":
            continue
        content = msg.get("content")
        if isinstance(content, str):
            return content.strip()
        if isinstance(content, list):
            texts = [
                p.get("text", "")
                for p in content
                if isinstance(p, dict) and p.get("type") == "text"
            ]
            return " ".join(texts).strip()
    return ""


def _extract_system_prompt(body: Dict[str, Any]) -> Optional[str]:
    parts: List[str] = []
    for msg in body.get("messages") or []:
        if msg.get("role") != "system":
            continue
        content = msg.get("content")
        if isinstance(content, str):
            parts.append(content)
        elif isinstance(content, list):
            for piece in content:
                if isinstance(piece, dict) and piece.get("type") == "text":
                    parts.append(piece.get("text", ""))
    return "\n\n".join(p for p in parts if p and p.strip()) or None


# ---------------------------------------------------------------------------
# Helpers: tool display
# ---------------------------------------------------------------------------

def _tool_icon_label(tool_name: str, lang: str = "en") -> tuple:
    name_lower = tool_name.lower()
    labels = _TOOL_LABEL.get(lang, _TOOL_LABEL["en"])
    return _TOOL_ICON.get(name_lower, "🔧"), labels.get(name_lower, tool_name)


def _tool_detail_block(
    tool_name: str, tool_input: Dict, tool_output: str, lang: str = "en"
) -> str:
    icon, label = _tool_icon_label(tool_name, lang)
    name_lower = tool_name.lower()

    # Build summary preview from most useful input field
    preview = ""
    for key, transform in [
        ("command", lambda v: v.split("\n")[0][:80]),
        ("path", lambda v: Path(v).name),
        ("file_path", lambda v: Path(v).name),
        ("description", lambda v: v[:80]),
        ("query", lambda v: v[:80]),
        ("url", lambda v: v[:80]),
        ("pattern", lambda v: v[:80]),
    ]:
        if key in tool_input:
            preview = transform(tool_input[key])
            break
    summary = f"{icon} {label}" + (f": {preview}" if preview else "")

    # Build input block
    if name_lower == "write" and "content" in tool_input:
        file_path = tool_input.get("path", tool_input.get("file_path", ""))
        ext = Path(file_path).suffix.lower()
        code_lang = _EXT_TO_LANG.get(ext, "text")
        p = Path(file_path)
        display_path = str(Path(*p.parts[-2:])) if len(p.parts) >= 2 else str(p)
        input_block = f"`{display_path}`\n\n```{code_lang}\n{tool_input['content']}\n```"
    elif name_lower == "edit" and "new_string" in tool_input:
        file_path = tool_input.get("path", "")
        ext = Path(file_path).suffix.lower()
        code_lang = _EXT_TO_LANG.get(ext, "text")
        p = Path(file_path)
        display_path = str(Path(*p.parts[-2:])) if len(p.parts) >= 2 else str(p)
        input_block = f"`{display_path}`\n\n```{code_lang}\n{tool_input.get('new_string', '')}\n```"
    elif "command" in tool_input:
        input_block = f"```bash\n{tool_input['command']}\n```"
    else:
        input_block = f"```json\n{json.dumps(tool_input, indent=2, ensure_ascii=False)}\n```"

    # Build output block
    output_block = ""
    if tool_output and tool_output.strip() and tool_output.strip() not in ("OK",):
        truncated = tool_output[:2000] + ("…" if len(tool_output) > 2000 else "")
        if name_lower == "read":
            # Use syntax-highlighted code fence based on file extension
            file_path = tool_input.get("path", tool_input.get("file_path", ""))
            ext = Path(file_path).suffix.lower()
            code_lang = _EXT_TO_LANG.get(ext, "text")
            output_block = f"\n\n```{code_lang}\n{truncated}\n```"
        else:
            # Replace ``` in output to avoid breaking the code fence
            safe_output = truncated.replace("```", "```".replace("`", "&#96;"))
            output_block = f"\n\n```\n{safe_output}\n```"

    return (
        f"\n\n<details>\n<summary>{summary}</summary>\n\n"
        f"{input_block}{output_block}\n\n</details>\n\n"
    )


# ---------------------------------------------------------------------------
# Pipe class
# ---------------------------------------------------------------------------

class Pipe:
    class Valves(BaseModel):

        # ── 1. Authentication ──────────────────────────────────────────────
        AUTH_MODE: Literal["provider", "anthropic_key", "anthropic_oauth"] = Field(
            default="anthropic_oauth",
            description=(
                "Authentication mode. Choose one:\n"
                "• anthropic_oauth — Claude Pro/Max/Team/Enterprise subscription. "
                "Uses CLAUDE_CODE_OAUTH_TOKEN. API_KEY and ANTHROPIC_BASE_URL are ignored. "
                "MODELS format: model_id (e.g. claude-sonnet-4-6). "
                "Token is personal — do not share in multi-user deployments (Anthropic ToS).\n"
                "• anthropic_key — Anthropic API directly. "
                "Uses API_KEY (format: sk-ant-...). "
                "ANTHROPIC_BASE_URL is ignored. costUSD is accurate. "
                "MODELS format: model_id (e.g. claude-sonnet-4-6).\n"
                "• provider — any Anthropic API-compatible provider "
                "(OpenRouter, DeepSeek, RouterAI, etc.). "
                "Uses API_KEY + ANTHROPIC_BASE_URL. Supports any model. "
                "MODELS format: provider/model (e.g. deepseek/deepseek-v4-flash)."
            ),
        )
        API_KEY: str = Field(
            default="",
            description=(
                "API key for your provider or Anthropic.\n"
                "• provider: key from your provider (sk-or-v1-... for OpenRouter, "
                "DeepSeek key, RouterAI key, etc.). Sent as ANTHROPIC_AUTH_TOKEN.\n"
                "• anthropic_key: Anthropic API key (sk-ant-...) from console.anthropic.com. "
                "Sent as ANTHROPIC_API_KEY.\n"
                "• anthropic_oauth: ignored."
            ),
        )
        CLAUDE_CODE_OAUTH_TOKEN: str = Field(
            default="",
            description=(
                "Claude subscription OAuth token (sk-ant-oat01-...). "
                "Only used in anthropic_oauth mode.\n"
                "How to generate: run 'claude setup-token' on any machine with a browser "
                "(does not have to be the OpenWebUI server). "
                "Copy the printed token and paste it here. Valid for 1 year.\n"
                "Requires: Claude Pro, Max, Team, or Enterprise subscription.\n"
                "⚠ Personal use only — do not share this token with other OpenWebUI users. "
                "Each user must generate their own token (Anthropic Terms of Service)."
            ),
        )
        ANTHROPIC_BASE_URL: str = Field(
            default="",
            description=(
                "Base URL of your Anthropic API-compatible provider. "
                "Do not include /v1 — Claude Code appends it automatically. "
                "Only used in provider mode; ignored in anthropic_key and anthropic_oauth.\n"
                "OpenRouter: https://openrouter.ai/api · "
                "DeepSeek: https://api.deepseek.com/anthropic · "
                "RouterAI: https://routerai.ru/api"
            ),
        )
        MODELS: str = Field(
            default="claude-sonnet-4-6,claude-opus-4-6",
            description=(
                "Comma-separated list of model IDs shown in the OpenWebUI model picker. "
                "These are examples — replace with the models you actually plan to use. "
                "Format depends on AUTH_MODE:\n"
                "• anthropic_oauth / anthropic_key: bare Anthropic model IDs. "
                "Examples: claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5.\n"
                "• provider: use the format required by your provider. "
                "OpenRouter examples: anthropic/claude-sonnet-4-6, deepseek/deepseek-v4-flash. "
                "DeepSeek direct examples: deepseek-v4-flash, deepseek-v4-pro."
            ),
        )

        # ── 2. Workspace ───────────────────────────────────────────────────
        WORKDIR_ROOT: str = Field(
            default=str(Path.home() / "ClaudeCode"),
            description="Root directory for per-chat project workspaces.",
        )
        CLAUDE_MD_TEMPLATE: str = Field(
            default="",
            description=(
                "Path to a CLAUDE.md template file. Copied into each new workspace as CLAUDE.md. "
                "Claude Code loads CLAUDE.md automatically unless --bare is used."
            ),
        )
        SYSTEM_PROMPT_FILE: str = Field(
            default="",
            description=(
                "Path to a file whose contents are appended to the system prompt "
                "(--append-system-prompt-file). Alternative to OpenWebUI workspace system prompt. "
                "Useful for large standing instructions that don't fit comfortably in a valve field. "
                "Leave empty to disable. If both this and the OpenWebUI workspace system prompt are set, "
                "both are appended (workspace prompt first, then this file)."
            ),
        )
        CLAUDE_BIN: str = Field(
            default="",
            description="Full path to claude binary. Leave empty to auto-detect via PATH.",
        )

        # ── 3. Agent behaviour ─────────────────────────────────────────────
        BARE_MODE: Literal["never", "always"] = Field(
            default="never",
            description=(
                "Controls how much context Claude Code loads at startup. "
                "'never' — recommended for agent work: full startup every request, loads CLAUDE.md "
                "and all tools automatically (Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch). "
                "Overhead ~8k tokens at start, mostly cached on subsequent turns. "
                "'always' — minimal startup: skips CLAUDE.md, auto-memory, hooks, plugins. "
                "Only Bash, Read, Edit are available — Write, Glob, Grep, WebSearch, WebFetch "
                "are NOT available. Use only for simple read-only tasks like code analysis or questions."
            ),
        )
        PERMISSION_MODE: Literal["bypassPermissions", "acceptEdits", "default", "plan"] = Field(
            default="bypassPermissions",
            description="Permission mode: 'bypassPermissions' (recommended), 'acceptEdits', 'default', or 'plan'.",
        )
        ALLOWED_TOOLS: str = Field(
            default="Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch",
            description="Comma-separated list of tools auto-approved without prompting.",
        )
        MAX_TURNS: int = Field(
            default=0,
            description="Maximum agent turns per request (0 = unlimited).",
        )

        # ── 4. Model and reasoning ─────────────────────────────────────────
        EFFORT_LEVEL: str = Field(
            default="",
            description=(
                "Claude Code reasoning effort level (CLAUDE_CODE_EFFORT_LEVEL). "
                "Values: low · medium · high · xhigh · max · auto · (empty = model default). "
                "Model defaults (v2.1.117+): Opus 4.7 → xhigh, Opus 4.6 / Sonnet 4.6 → high. "
                "Leave empty to use the model default — already reasonable for most tasks. "
                "DeepSeek recommends 'max' for their models when used with Claude Code. "
                "WARNING: 'max' is NOT supported on Sonnet — use only with Opus models. "
                "'xhigh' falls back to 'high' on models that don't support it (e.g. Opus 4.6). "
                "Non-Anthropic models (DeepSeek, Tencent) that don't support effort ignore this setting."
            ),
        )
        MAX_THINKING_TOKENS: int = Field(
            default=0,
            description=(
                "Hard cap on thinking tokens per request (MAX_THINKING_TOKENS). "
                "0 = disabled (use model/effort default). "
                "Useful to limit reasoning cost: e.g. 8000 cuts thinking budget to ~8K tokens. "
                "Note: budget_tokens is deprecated on Opus 4.6/Sonnet 4.6 — use EFFORT_LEVEL instead. "
                "For older models or DeepSeek: may be ignored or accepted without effect. "
                "Only set this if you need a hard ceiling on thinking cost regardless of effort level."
            ),
        )
        SUBAGENT_MODEL: str = Field(
            default="",
            description=(
                "Override model for subagents spawned by Claude Code (CLAUDE_CODE_SUBAGENT_MODEL). "
                "Useful for cost control: run main agent on a powerful model, subagents on a cheaper one. "
                "The model name format MUST match your provider (ANTHROPIC_BASE_URL): "
                "DeepSeek direct (api.deepseek.com): deepseek-v4-flash · "
                "OpenRouter (openrouter.ai): deepseek/deepseek-v4-flash · "
                "Only affects subagents without an explicit model in their frontmatter. "
                "Leave empty to use the same model as the main agent."
            ),
        )

        # ── 5. Context and memory ──────────────────────────────────────────
        DISABLE_AUTO_MEMORY: bool = Field(
            default=False,
            description=(
                "Disable Claude Code's auto memory system (CLAUDE_CODE_DISABLE_AUTO_MEMORY=1). "
                "Auto memory writes project notes to ~/.claude/projects/.../memory/MEMORY.md across sessions. "
                "Recommended if you use CLAUDE_MD_TEMPLATE — prevents conflicts between accumulated "
                "memory and your template instructions. Also improves prompt cache hit rates with DeepSeek "
                "by keeping startup context stable between requests. "
                "Does NOT affect CLAUDE.md (loaded regardless) or session history (-r session_id)."
            ),
        )
        MAX_CONTEXT_TOKENS: int = Field(
            default=0,
            description=(
                "Override Claude Code's context window size (CLAUDE_CODE_MAX_CONTEXT_TOKENS). "
                "0 = disabled (use provider/model default). "
                "Set lower when using a provider or model with a smaller context window than Claude's default. "
                "Example: 32000 for a model limited to 32K tokens. "
                "Has no effect if the value exceeds the model's actual context window."
            ),
        )
        AUTOCOMPACT_PCT: int = Field(
            default=0,
            description=(
                "Context fill percentage at which Claude Code auto-compacts conversation history "
                "(CLAUDE_AUTOCOMPACT_PCT_OVERRIDE). "
                "0 = disabled (use Claude Code default, currently ~85%). "
                "With DeepSeek's 1M context window you can raise this to 95 to delay compaction "
                "and preserve more session history, reducing re-reading overhead. "
                "With a smaller context window, lower it (e.g. 70) to compact earlier and avoid errors. "
                "Valid range: 1–99."
            ),
        )

        # ── 6. Performance and compatibility ───────────────────────────────
        API_TIMEOUT_MS: int = Field(
            default=600000,
            description=(
                "Timeout in milliseconds for Claude Code CLI API requests (API_TIMEOUT_MS). "
                "Recommended by DeepSeek for long agentic outputs to prevent premature timeouts. "
                "Default: 600000 (10 minutes). Increase for very long-running tasks."
            ),
        )
        DISABLE_EXPERIMENTAL_BETAS: bool = Field(
            default=False,
            description=(
                "Disable experimental beta headers sent by Claude Code "
                "(CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1). "
                "Enable if you get HTTP 400 errors mentioning 'anthropic-beta' from your gateway. "
                "Note: the 'advanced-tool-use-2025-11-20' beta header is NOT covered by this flag "
                "(known Claude Code bug). DeepSeek and OpenRouter ignore unknown beta headers silently."
            ),
        )

        # ── 7. UI ──────────────────────────────────────────────────────────
        LANGUAGE: Literal["en", "ru"] = Field(
            default="en",
            description="Language for tool labels in chat UI: 'en' (English) or 'ru' (Russian).",
        )
        STARTUP_MESSAGE: str = Field(
            default="Starting Claude Code…",
            description="Status message shown while Claude Code is initializing.",
        )
        SHOW_COST: bool = Field(
            default=False,
            description=(
                "Show estimated cost in the token summary after each response. "
                "Accuracy depends on AUTH_MODE:\n"
                "• anthropic_key — accurate (official Anthropic rates).\n"
                "• provider — inaccurate: Claude Code CLI uses Anthropic's price table, "
                "not your provider's actual rates. Check provider dashboard for real billing.\n"
                "• anthropic_oauth — always hidden regardless of this setting "
                "(subscription has no per-token billing)."
            ),
        )

    def __init__(self):
        self.valves = self.Valves()

    def pipes(self) -> List[Dict[str, str]]:
        result = []
        for raw in self.valves.MODELS.split(","):
            model_id = raw.strip()
            if model_id:
                result.append({"id": model_id, "name": _model_display_name(model_id)})
        return result

    async def pipe(
        self,
        body: Dict[str, Any],
        __chat_id__: Optional[str] = None,
        __event_emitter__: Optional[Callable] = None,
        __user__: Optional[Dict[str, Any]] = None,
        __metadata__: Optional[Dict[str, Any]] = None,
        __files__: Optional[List[Dict[str, Any]]] = None,
        __task__: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:

        # ------------------------------------------------------------------ #
        # 0. Skip OpenWebUI background tasks (title/tags/autocomplete)
        # ------------------------------------------------------------------ #
        if __task__ is not None:
            log.debug("[CC_PIPE] skipping background task: %s", __task__)
            return

        # ------------------------------------------------------------------ #
        # 1. Resolve model
        # ------------------------------------------------------------------ #
        model_id = _extract_model_id(body.get("model", ""))
        registered_ids = [m["id"] for m in self.pipes()]
        if model_id not in registered_ids:
            model_id = registered_ids[0] if registered_ids else ""
        log.debug("[CC_PIPE] start model=%s", model_id)
        lang = self.valves.LANGUAGE if self.valves.LANGUAGE in ("ru", "en") else "en"

        # Warn if model ID contains provider prefix in non-provider mode
        auth_mode = self.valves.AUTH_MODE
        if auth_mode in ("anthropic_key", "anthropic_oauth") and "/" in model_id:
            log.warning(
                "[CC_PIPE] AUTH_MODE=%s but model_id '%s' contains a provider prefix ('/'). "
                "Anthropic API expects bare model IDs (e.g. claude-sonnet-4-6). "
                "Update MODELS valve to match AUTH_MODE.",
                auth_mode, model_id,
            )

        # ------------------------------------------------------------------ #
        # 2. Extract prompt
        # ------------------------------------------------------------------ #
        prompt = _extract_latest_user_prompt(body)
        if not prompt:
            yield "_No user message found._"
            return

        # ------------------------------------------------------------------ #
        # 3. Load chat state
        # ------------------------------------------------------------------ #
        chat_id = __chat_id__ or "default"
        session_id, workdir_name, saved_model_id = await _load_chat_state(chat_id)

        # /new or /reset — start a fresh session, keep workdir and files
        _RESET_TRIGGERS = ("/new", "/reset", "/fresh", "/restart")
        if any(prompt.strip().lower().startswith(t) for t in _RESET_TRIGGERS):
            # Strip the command from the prompt
            for t in _RESET_TRIGGERS:
                if prompt.strip().lower().startswith(t):
                    prompt = prompt.strip()[len(t):].strip()
                    break
            if session_id:
                await _save_chat_state(chat_id, None, workdir_name, saved_model_id)
                session_id = None
                yield "> 🔄 Session reset — starting fresh. Project files are preserved.\n\n"
            else:
                yield "> ℹ️ No active session to reset.\n\n"
            if not prompt:
                return

        # Note: unlike Qwen Code, we do NOT reset session on model change.
        # Claude Code stores session history locally and resumes it with any model.
        model_changed = bool(session_id and saved_model_id and saved_model_id != model_id)

        # ------------------------------------------------------------------ #
        # 4. Resolve / create workdir
        # ------------------------------------------------------------------ #
        if not workdir_name:
            workdir_name = await _project_name_from_prompt(prompt, __event_emitter__)
            if workdir_name == "Project":
                workdir_name = f"Project_{chat_id[:6]}"

        user_info = __user__ or {}
        user_name = (
            user_info.get("name")
            or (user_info.get("email") or "").split("@")[0]
            or "default"
        )
        user_folder = re.sub(r"[^\w\-]", "_", user_name) or "default"
        workdir = Path(self.valves.WORKDIR_ROOT) / user_folder / workdir_name
        workdir.mkdir(parents=True, exist_ok=True)
        log.debug("[CC_PIPE] workdir=%s session_id=%s", workdir, session_id)

        # ------------------------------------------------------------------ #
        # 5. CLAUDE.md template
        # ------------------------------------------------------------------ #
        claude_md_path = workdir / "CLAUDE.md"
        if self.valves.CLAUDE_MD_TEMPLATE:
            template = Path(self.valves.CLAUDE_MD_TEMPLATE)
            if template.exists() and not claude_md_path.exists():
                shutil.copy2(template, claude_md_path)

        # ------------------------------------------------------------------ #
        # 6. Build process environment
        # ------------------------------------------------------------------ #
        env = {**os.environ}

        auth_mode = self.valves.AUTH_MODE

        if auth_mode == "anthropic_oauth":
            # OAuth subscription token — must clear higher-priority vars or they win:
            # ANTHROPIC_AUTH_TOKEN (priority 2) and ANTHROPIC_API_KEY (priority 3)
            # both beat CLAUDE_CODE_OAUTH_TOKEN (priority 5) in CC's auth ladder.
            env["CLAUDE_CODE_OAUTH_TOKEN"] = self.valves.CLAUDE_CODE_OAUTH_TOKEN
            env.pop("ANTHROPIC_AUTH_TOKEN", None)
            env["ANTHROPIC_API_KEY"] = ""
            env.pop("ANTHROPIC_BASE_URL", None)  # CC goes to api.anthropic.com by default

        elif auth_mode == "anthropic_key":
            # Direct Anthropic API key — sent as X-Api-Key header.
            # Must clear ANTHROPIC_AUTH_TOKEN (priority 2) — it beats ANTHROPIC_API_KEY (3).
            env["ANTHROPIC_API_KEY"] = self.valves.API_KEY
            env.pop("ANTHROPIC_AUTH_TOKEN", None)
            env.pop("ANTHROPIC_BASE_URL", None)  # CC goes to api.anthropic.com by default

        else:
            # provider (default) — any Anthropic API-compatible gateway.
            # Use ANTHROPIC_AUTH_TOKEN (priority 2) — highest non-cloud priority,
            # works as Bearer token for LLM gateways and proxies.
            # ANTHROPIC_API_KEY must be "" per OpenRouter docs — absent causes fallback.
            if self.valves.API_KEY:
                env["ANTHROPIC_AUTH_TOKEN"] = self.valves.API_KEY
            env["ANTHROPIC_API_KEY"] = ""
            env["ANTHROPIC_BASE_URL"] = self.valves.ANTHROPIC_BASE_URL

        # Model selection — set all alias slots to the same model so Claude Code's
        # internal alias resolution always picks our model regardless of mode
        env["ANTHROPIC_MODEL"] = model_id
        env["ANTHROPIC_DEFAULT_SONNET_MODEL"] = model_id
        env["ANTHROPIC_DEFAULT_HAIKU_MODEL"] = model_id
        env["ANTHROPIC_DEFAULT_OPUS_MODEL"] = model_id

        # Disable non-essential traffic (session title generation via Haiku)
        env["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"] = "1"

        # Timeout for API requests — prevents premature timeouts on long agentic outputs
        env["API_TIMEOUT_MS"] = str(self.valves.API_TIMEOUT_MS)

        # Optional: reasoning effort level
        if self.valves.EFFORT_LEVEL:
            env["CLAUDE_CODE_EFFORT_LEVEL"] = self.valves.EFFORT_LEVEL

        # Optional: override model for subagents (cost optimization)
        if self.valves.SUBAGENT_MODEL:
            env["CLAUDE_CODE_SUBAGENT_MODEL"] = self.valves.SUBAGENT_MODEL

        # Optional: disable auto memory (recommended with CLAUDE_MD_TEMPLATE)
        if self.valves.DISABLE_AUTO_MEMORY:
            env["CLAUDE_CODE_DISABLE_AUTO_MEMORY"] = "1"

        # Optional: disable experimental beta headers (for strict API gateways)
        if self.valves.DISABLE_EXPERIMENTAL_BETAS:
            env["CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS"] = "1"

        # Optional: hard cap on thinking tokens (for cost control)
        if self.valves.MAX_THINKING_TOKENS > 0:
            env["MAX_THINKING_TOKENS"] = str(self.valves.MAX_THINKING_TOKENS)

        # Optional: override context window size (for providers with smaller windows)
        if self.valves.MAX_CONTEXT_TOKENS > 0:
            env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"] = str(self.valves.MAX_CONTEXT_TOKENS)

        # Optional: override auto-compaction threshold
        if 1 <= self.valves.AUTOCOMPACT_PCT <= 99:
            env["CLAUDE_AUTOCOMPACT_PCT_OVERRIDE"] = str(self.valves.AUTOCOMPACT_PCT)

        # ------------------------------------------------------------------ #
        # 7. Determine bare mode for this request
        # ------------------------------------------------------------------ #
        bare_mode = self.valves.BARE_MODE
        use_bare = False
        if bare_mode == "always":
            # WARNING: only Bash, Read, Edit available — Write and others not accessible
            use_bare = True
        # bare_mode == "never": full startup, all tools available (recommended)

        # ------------------------------------------------------------------ #
        # 8. Build CLI command
        # ------------------------------------------------------------------ #
        claude_bin = self.valves.CLAUDE_BIN or shutil.which("claude") or "claude"
        system_prompt = _extract_system_prompt(body)
        allowed_tools = [t.strip() for t in self.valves.ALLOWED_TOOLS.split(",") if t.strip()]

        cmd = [claude_bin]

        # Bare mode — skip auto-discovery of hooks, plugins, CLAUDE.md, auto-memory
        if use_bare:
            cmd.append("--bare")

        cmd += [
            "--output-format", "stream-json",
            "--verbose",
            "--include-partial-messages",
            "--permission-mode", self.valves.PERMISSION_MODE,
        ]

        # Allowed tools — must come before -p flag
        if allowed_tools:
            cmd += ["--allowedTools"] + allowed_tools

        # Session resume: use -r <session_id> when we have a prior session
        # Claude Code preserves session history regardless of model changes
        if session_id:
            cmd += ["-r", session_id]

        # Max turns
        if self.valves.MAX_TURNS > 0:
            cmd += ["--max-turns", str(self.valves.MAX_TURNS)]

        # System prompt from OpenWebUI workspace
        if system_prompt:
            cmd += ["--append-system-prompt", system_prompt]

        # Additional system prompt from file (appended after workspace prompt)
        if self.valves.SYSTEM_PROMPT_FILE:
            sp_path = Path(self.valves.SYSTEM_PROMPT_FILE)
            if sp_path.exists() and sp_path.is_file():
                cmd += ["--append-system-prompt-file", str(sp_path)]
            else:
                log.warning("[CC_PIPE] SYSTEM_PROMPT_FILE not found: %s", sp_path)

        # -p flag and prompt must come last
        cmd += ["-p", prompt]

        log.debug("[CC_PIPE] cmd=%s bare=%s", " ".join(cmd[:10]) + "...", use_bare)

        # ------------------------------------------------------------------ #
        # 9. Helpers
        # ------------------------------------------------------------------ #
        async def emit_status(description: str, done: bool = False) -> None:
            if __event_emitter__:
                await __event_emitter__(
                    {"type": "status", "data": {"description": description, "done": done}}
                )

        # ------------------------------------------------------------------ #
        # 10. Announce model change (informational only — session continues)
        # ------------------------------------------------------------------ #
        if model_changed:
            yield (
                f"> ℹ️ **Model switched** ({saved_model_id} → {model_id}). "
                f"Session history is preserved — the agent remembers previous context.\n\n"
            )

        # ------------------------------------------------------------------ #
        # 11. Run subprocess
        # ------------------------------------------------------------------ #
        scan_dirs = [workdir]
        artifact_snapshot = _snapshot_artifacts(scan_dirs)
        new_session_id: Optional[str] = None
        pending_tools: Dict[str, Dict] = {}   # tool_use_id → {name, input}
        active_tool_label: Optional[str] = None
        active_tool_start: float = 0.0
        thinking_block_indices: set = set()  # track indices of open thinking blocks
        text_buffer: str = ""  # buffer text arriving while thinking blocks are open
        thinking_start: float = 0.0  # when first thinking block opened
        process: Optional[asyncio.subprocess.Process] = None
        heartbeat_task: Optional[asyncio.Task] = None

        # Token tracking from modelUsage (accurate, per-model breakdown)
        model_usage: Dict[str, Dict] = {}

        async def _heartbeat() -> None:
            try:
                while True:
                    await asyncio.sleep(2)
                    if active_tool_label:
                        elapsed = int(time.monotonic() - active_tool_start)
                        await emit_status(f"⏳ {active_tool_label} · {elapsed}s…")
            except asyncio.CancelledError:
                pass

        await emit_status(self.valves.STARTUP_MESSAGE)

        try:
            # Default StreamReader limit is 64KB — too small for large tool outputs.
            # Set to 32MB to handle big file reads or long tool results.
            _STREAM_LIMIT = 32 * 1024 * 1024
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                stdin=asyncio.subprocess.DEVNULL,
                env=env,
                cwd=str(workdir),
                limit=_STREAM_LIMIT,
            )
            heartbeat_task = asyncio.create_task(_heartbeat())

            async for raw_line in process.stdout:
                line = raw_line.decode("utf-8", errors="replace").strip()
                if not line:
                    continue
                log.debug("[CC_PIPE] raw: %s", line[:200])

                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue

                etype = event.get("type")
                subtype = event.get("subtype", "")

                # ── system events ──────────────────────────────────────────
                if etype == "system":
                    if subtype == "init":
                        # Capture session_id from first init event
                        sid = event.get("session_id")
                        if sid:
                            new_session_id = sid
                            await _save_chat_state(
                                chat_id, new_session_id, workdir_name, model_id
                            )
                    # subtype == "status" — intermediate status, ignore silently
                    # subtype == "api_retry" — show retry info to user
                    elif subtype == "api_retry":
                        attempt = event.get("attempt", "?")
                        max_retries = event.get("max_retries", "?")
                        delay_ms = event.get("retry_delay_ms", 0)
                        error = event.get("error", "unknown")
                        error_status = event.get("error_status")
                        status_str = f" HTTP {error_status}" if error_status else ""
                        await emit_status(
                            f"⏳ API retry {attempt}/{max_retries} "
                            f"({error}{status_str}, {delay_ms // 1000}s delay)…"
                        )

                # ── streaming text, thinking, redacted_thinking ────────────
                elif etype == "stream_event":
                    ev = event.get("event", {})
                    ev_type = ev.get("type")

                    if ev_type == "content_block_start":
                        block_type = ev.get("content_block", {}).get("type", "")
                        idx = ev.get("index", -1)
                        if block_type == "thinking":
                            if not thinking_block_indices:
                                thinking_start = time.monotonic()
                            thinking_block_indices.add(idx)
                            yield "<think>\n"
                        # redacted_thinking: emit nothing
                        # text block starts while thinking may still be open —
                        # buffer text until thinking is closed (see text_delta below)

                    elif ev_type == "content_block_stop":
                        idx = ev.get("index", -1)
                        if idx in thinking_block_indices:
                            thinking_block_indices.discard(idx)
                            if not thinking_block_indices:
                                thinking_start = 0.0
                            yield "\n</think>\n"
                            # Flush any text that arrived during thinking
                            if text_buffer:
                                yield text_buffer
                                text_buffer = ""

                    elif ev_type == "content_block_delta":
                        delta = ev.get("delta", {})
                        delta_type = delta.get("type")
                        if delta_type == "text_delta":
                            text = delta.get("text", "")
                            if text:
                                if thinking_block_indices:
                                    # Thinking still open — buffer text to emit after
                                    text_buffer += text
                                else:
                                    # No open thinking blocks — emit immediately
                                    if text_buffer:
                                        yield text_buffer
                                        text_buffer = ""
                                    yield text
                        elif delta_type == "thinking_delta":
                            text = delta.get("thinking", "")
                            if text:
                                yield text
                        # signature_delta (for redacted_thinking): ignore

                # ── tool calls from assistant ──────────────────────────────
                elif etype == "assistant":
                    msg = event.get("message", {})
                    for content in msg.get("content", []):
                        ctype = content.get("type")
                        if ctype == "tool_use":
                            tool_id = content.get("id", "")
                            tool_name = content.get("name", "tool")
                            tool_input = content.get("input", {})
                            pending_tools[tool_id] = {"name": tool_name, "input": tool_input}

                            icon, label = _tool_icon_label(tool_name, lang)
                            preview = ""
                            for key, transform in [
                                ("command", lambda v: v.split("\n")[0][:80]),
                                ("path", lambda v: Path(v).name),
                                ("file_path", lambda v: Path(v).name),
                                ("description", lambda v: v[:80]),
                                ("query", lambda v: v[:80]),
                                ("url", lambda v: v[:80]),
                                ("pattern", lambda v: v[:80]),
                            ]:
                                if key in tool_input:
                                    preview = transform(tool_input[key])
                                    break
                            active_tool_label = f"{icon} {label}" + (f": {preview}" if preview else "")
                            active_tool_start = time.monotonic()
                            await emit_status(f"⚙️ {active_tool_label}")

                # ── tool results from user ─────────────────────────────────
                elif etype == "user":
                    msg = event.get("message", {})
                    for content in msg.get("content", []):
                        if content.get("type") == "tool_result":
                            tool_id = content.get("tool_use_id", "")
                            tool_output = ""
                            for part in content.get("content", []):
                                if isinstance(part, dict) and part.get("type") == "text":
                                    tool_output += part.get("text", "")
                                elif isinstance(part, str):
                                    tool_output += part

                            if tool_id in pending_tools:
                                tool_info = pending_tools.pop(tool_id)
                                active_tool_label = None
                                icon, label = _tool_icon_label(tool_info["name"], lang)
                                await emit_status(f"✅ {icon} {label}")
                                yield _tool_detail_block(
                                    tool_info["name"], tool_info["input"], tool_output, lang
                                )

                # ── final result ───────────────────────────────────────────
                elif etype == "result":
                    # Capture accurate per-model token usage
                    model_usage = event.get("modelUsage", {}) or {}
                    # Also update session_id if we didn't get it from init
                    sid = event.get("session_id")
                    if sid and not new_session_id:
                        new_session_id = sid
                        await _save_chat_state(
                            chat_id, new_session_id, workdir_name, model_id
                        )

            # --- stdout exhausted ---
            log.debug("[CC_PIPE] stdout exhausted, waiting for process exit")
            t0 = time.monotonic()
            await process.wait()
            log.debug("[CC_PIPE] process exited %.2fs rc=%s", time.monotonic() - t0, process.returncode)

            if process.returncode != 0:
                stderr_bytes = await process.stderr.read()
                stderr_text = stderr_bytes.decode("utf-8", errors="replace").strip()
                if stderr_text:
                    log.warning("[CC_PIPE] stderr rc=%s: %s", process.returncode, stderr_text[-2000:])

                # If session resume failed — clear stale session_id so next request starts fresh
                if session_id and not new_session_id:
                    log.warning("[CC_PIPE] session %s may be stale, clearing", session_id)
                    await _save_chat_state(chat_id, None, workdir_name, model_id)
                    yield "\n\n> ⚠️ Session not found — cleared. Please resend your message to start a new session.\n"
                else:
                    yield f"\n\n> ⚠️ Claude Code exited with code {process.returncode}.\n"

        except asyncio.CancelledError:
            log.debug("[CC_PIPE] CancelledError — killing subprocess")
            if process and process.returncode is None:
                try:
                    process.kill()
                    await process.wait()
                    log.debug("[CC_PIPE] subprocess killed")
                except Exception as kill_exc:
                    log.warning("[CC_PIPE] failed to kill subprocess: %s", kill_exc)
            raise

        except Exception as exc:
            log.exception("Claude Code pipe failed")
            await emit_status(f"Error: {exc}", done=True)
            yield f"\n\n**Claude Code error:** `{type(exc).__name__}: {exc}`\n"
            return

        finally:
            if heartbeat_task and not heartbeat_task.done():
                heartbeat_task.cancel()
                try:
                    await heartbeat_task
                except asyncio.CancelledError:
                    pass
            # Emit any tool calls that never got a result (interrupted)
            for tool_info in pending_tools.values():
                yield _tool_detail_block(
                    tool_info["name"], tool_info["input"], "(interrupted)", lang
                )

        await emit_status("Done.", done=True)

        # ------------------------------------------------------------------ #
        # 12. Upload new/changed artifacts
        # ------------------------------------------------------------------ #
        log.debug("[CC_PIPE] scanning for new artifacts")
        t0 = time.monotonic()
        for chunk in await _upload_new_artifacts(scan_dirs, artifact_snapshot, user_info.get("id")):
            yield chunk
        log.debug("[CC_PIPE] artifacts done in %.2fs", time.monotonic() - t0)

        # ------------------------------------------------------------------ #
        # 13. Token summary from modelUsage (accurate, per-model)
        # ------------------------------------------------------------------ #
        if model_usage:
            parts = []
            total_in = total_out = total_cache = 0
            total_cost = 0.0
            multi_model = len(model_usage) > 1
            # Cost accuracy depends on auth mode:
            # anthropic_key — accurate (official Anthropic rates)
            # anthropic_oauth — meaningless (subscription, no per-token billing)
            # provider — inaccurate (CC uses Anthropic price table, not provider rates)
            show_cost = self.valves.SHOW_COST and auth_mode != "anthropic_oauth"
            for mid, usage in model_usage.items():
                inp = usage.get("inputTokens", 0)
                out = usage.get("outputTokens", 0)
                cached = usage.get("cacheReadInputTokens", 0)
                cost = usage.get("costUSD", 0.0) or 0.0
                total_in += inp
                total_out += out
                total_cache += cached
                total_cost += cost
                short = mid.split("/")[-1] if "/" in mid else mid
                cached_str = f" {cached:,}⚡" if cached else ""
                cost_str = f" ${cost:.4f}" if (show_cost and cost) else ""
                parts.append(f"{short}: {inp:,}↑ {out:,}↓{cached_str}{cost_str}")
            suffix_parts = []
            if multi_model and total_cache:
                suffix_parts.append(f"{total_cache:,}⚡ total cached")
            if show_cost and total_cost and multi_model:
                suffix_parts.append(f"${total_cost:.4f} total")
            suffix = f" · {' · '.join(suffix_parts)}" if suffix_parts else ""
            yield f"\n\n_📊 {' · '.join(parts)}{suffix}_\n"