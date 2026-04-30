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

Existing summaries are never overwritten.

## Model

Summarization uses `openai-codex/gpt-5.5` via pi's current model registry/auth flow. Gemini is intentionally not used.
