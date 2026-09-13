---
name: review
description: Explicitly launch and coordinate one or more pi review sessions through Herdr and pi-intercom.
disable-model-invocation: true
---

# Review

Read and follow [the shared delegation protocol](../references/protocol.md)
before launching any session. This skill is manually invoked; the user's
arguments are authoritative about the review target, models, reviewer count,
and whether reviewers should collaborate.

## Models and defaults

- Fable: `anthropic/claude-fable-5-1`, thinking `medium`
- Astra: `openai-codex/gpt-6-astra`, thinking `medium`
- Default when no reviewer is named: launch both fable and astra
- Name patterns: `review-fable`, `review-astra`, or `review-<topic>`

If the user names one reviewer, launch only that reviewer. If the user requests
both, launch both regardless of the controlling session's model. Do not replace
an explicit request with the default pair.

## Brief

Give every reviewer the same target, constraints, and severity expectations. By
default, reviewers do not edit files. Require actionable findings with file and
line evidence, impact, and a concrete remediation. Tell reviewers when a clean
review with no findings is an acceptable result.

For a paired review, tell each reviewer the other's session name. Each completes
an independent pass before comparing findings over `pi-intercom`. They should
resolve disagreements where possible and return one consolidated review listing:

- agreed findings and severity
- dismissed findings and why
- unresolved disagreements with both positions

If the user requests a different collaboration style, follow it.

## Completion

Assess the consolidated findings yourself. Verify cited code before presenting
issues, and clearly identify any disagreement you could not resolve. Do not
paste raw reviewer transcripts.
