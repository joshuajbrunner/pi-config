# Session Tools

Adds session summary and browsing commands.

## Commands

```text
/summarize
/summarize <custom instruction>
/summarize full
/summarize full <custom instruction>
/session-browser
/session-browser all
```

## Session browser

`/session-browser` opens a centered floating overlay. It lists sessions by saved short summary when available, supports type-to-filter search, and opens a detail view with `d` for full summaries, first message, metrics, and metadata. Use `j/k` or arrow keys to move, `ctrl+u/d` or `fn+up/down` to page, `s` to summarize the selected session, `S` to create a full summary, `enter` to resume, and `esc` to cancel.

## Summary storage

Summaries are saved beside the session JSONL file in a folder named with the session id:

```text
~/.pi/agent/sessions/<cwd-dir>/<session-file>.jsonl
~/.pi/agent/sessions/<cwd-dir>/<session-id>/summary-<timestamp>.md
```

Existing summaries are never overwritten. `/summarize` creates the session-id directory immediately and appends debug events to `debug.jsonl` in that directory.

## Model

`/summarize` saves a one-line short summary by default. `/summarize full` saves a short summary plus a detailed resume summary.

Summarization first tries `openai-codex/gpt-5.5`, then falls back to `anthropic/claude-sonnet-4-5` via pi's current model registry/auth flow. Gemini is intentionally not used.
