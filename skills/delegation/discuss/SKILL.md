---
name: discuss
description: Explicitly launch and conduct a substantive discussion with one or more pi sessions through Herdr and pi-intercom.
disable-model-invocation: true
---

# Discuss

Read and follow [the shared delegation protocol](../references/protocol.md)
before launching any session. This skill is manually invoked; the user's
arguments are authoritative about the topic, models, number of participants,
and desired form of discussion.

## Models and defaults

- Fable: `anthropic/claude-fable-5-1`, thinking `medium`
- Astra: `openai-codex/gpt-6-astra`, thinking `medium`
- Name patterns: `discuss-fable`, `discuss-astra`, or `discuss-<topic>`

Honor every explicitly named participant. When the user names no model, inspect
`PI_PROVIDER` and `PI_MODEL` and launch fable unless the controlling session is
already fable, in which case launch astra. Never choose the controlling
session's own model for a one-on-one discussion.

## One-on-one discussion

The controlling session is a participant, not merely a message relay:

1. Send its position and the specific question to challenge.
2. Respond to objections, refine the position, and concede or defend claims.
3. Continue until both sides converge or clearly state the remaining dispute.
4. Stop when further exchange would repeat established points.

## Independent discussion

When the user requests multiple independent participants, give them the same
brief and each other's session names. Ask them to exchange positions directly
over `pi-intercom` and return a joint account of agreements and disagreements.
The controlling session facilitates and then adds its own assessment.

## Completion

Report what changed in the reasoning, what the participants agreed on, and what
remains contested. For each unresolved point, preserve the reasoning on both
sides rather than forcing artificial consensus.
