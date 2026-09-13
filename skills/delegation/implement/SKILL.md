---
name: implement
description: Explicitly launch and supervise pi sessions that implement a requested change through Herdr and pi-intercom.
disable-model-invocation: true
---

# Implement

Read and follow [the shared delegation protocol](../references/protocol.md)
before launching any session. This skill is manually invoked; treat the user's
arguments as the implementation assignment and as authoritative instructions
about scope, models, session count, and ownership.

## Defaults

- Model: `openai-codex/gpt-5.6-sol`
- Thinking: `medium`
- Sessions: one, unless the work separates cleanly into non-overlapping pieces
- Name pattern: `impl-<topic>`

When launching multiple implementers, assign non-overlapping files or pieces so
they cannot overwrite one another. If ownership cannot be divided cleanly, use
one session.

## Brief

In addition to the shared briefing contract, specify:

- the exact behavior to implement
- files the session owns and files it must not touch
- structural and compatibility constraints
- verification commands and acceptance criteria
- that it must report files changed and verification results

## Completion

Inspect every changed file and review the combined diff yourself. Run the
required verification before reporting completion. Do not treat a spawned
session's success claim as sufficient evidence.
