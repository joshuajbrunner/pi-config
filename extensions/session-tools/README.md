# Session Tools

Adds session summary and browsing commands.

## Commands

```text
/summarize
/summarize <custom instruction>
/session-browser
/session-browser all
```

## Summary storage

Summaries are saved beside the session JSONL file in a folder named with the session id:

```text
~/.pi/agent/sessions/<cwd-dir>/<session-file>.jsonl
~/.pi/agent/sessions/<cwd-dir>/<session-id>/summary-<timestamp>.md
```

Existing summaries are never overwritten. `/summarize` creates the session-id directory immediately and appends debug events to `debug.jsonl` in that directory.

## Model

Summarization first tries `openai-codex/gpt-5.5`, then falls back to `anthropic/claude-sonnet-4-5` via pi's current model registry/auth flow. Gemini is intentionally not used.
