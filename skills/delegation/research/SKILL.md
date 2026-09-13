---
name: research
description: Explicitly launch and coordinate pi sessions that research a requested topic through Herdr and pi-intercom.
disable-model-invocation: true
---

# Research

Read and follow [the shared delegation protocol](../references/protocol.md)
before launching any session. This skill is manually invoked; treat the user's
arguments as the research question and as authoritative instructions about
scope, models, session count, and output.

## Defaults

- Model: `openai-codex/gpt-5.6-luna`
- Thinking: `low`
- Sessions: one or more only for non-overlapping questions
- Name pattern: `research-<topic>`
- Mode: read-only investigation unless the user explicitly requests changes

When using multiple researchers, give each a distinct question. Do not ask two
sessions to independently answer the same question unless the user explicitly
requests corroboration.

## Brief

In addition to the shared briefing contract, specify:

- the exact question assigned to that session
- relevant repositories, documentation, or APIs
- the required evidence, such as file paths, declarations, or source links
- assumptions that must be verified rather than guessed
- a concise expected findings format

## Completion

Check important claims against the cited evidence. Combine the findings into one
answer organized around the user's question; do not return raw session reports.
Identify uncertainty and disagreements explicitly.
