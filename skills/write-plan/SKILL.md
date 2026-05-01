---
name: write-plan
description: Interview the user about a plan or feature until reaching shared understanding, then document it as a high-level structured plan. Use when the user wants to plan a feature, design a system, or mentions "write a plan" or "plan this out". Does NOT include tasks - use /skill:write-stories after to decompose into actionable stories.
---

# Write Plan

Help the user develop and document a well-structured plan through systematic questioning.

## Process

### Phase 1: Discovery

Interview the user relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one.

For each question:

- Provide your recommended answer based on the codebase and context
- Ask one question at a time
- If a question can be answered by exploring the codebase, explore the codebase instead

### Phase 2: Documentation

Once we have shared understanding:

1. Determine the next phase number by checking existing plans in `docs/plans/`
2. Ask the user for a plan name (kebab-case, e.g., `tenant-foundation`, `encryption`)
3. Create the plan at `docs/plans/{NNN}-{name}/PLAN.md`

## Plan Structure

```markdown
# Phase N: <Title>

**Status**: ⬜ Not Started
**Depends on**: Phase N-1 (<name>)

## Overview

Brief description of what this phase accomplishes (1-2 paragraphs).

## Stories

| # | Story | Status |
|---|-------|--------|
| N.1 | [Story Title](./stories/001-story-name.md) | ⬜ Not Started |
| N.2 | [Story Title](./stories/002-story-name.md) | ⬜ Not Started |

## Dependencies

Which phases must be complete first, and why.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Key decision 1 | What we chose | Why |

## Out of Scope

- What this phase explicitly does NOT cover
- Things that belong in a later phase

## References

- Links to relevant reference docs
```

## Guidelines

- **Stories are titles only** in the PLAN.md. Story files are NOT created yet — use `/skill:write-stories` when ready to flesh them out.
- **Keep plans focused** — one clear goal per phase. If it's doing two unrelated things, split it.
- **Number sequentially** — check `ls docs/plans/` for the next number.
- **Dependency chain** — later phases depend on earlier ones. Make this explicit.
- **3-6 stories per plan** — if more, the phase is too big. Split it.

## Storage Location

```
docs/plans/{NNN}-{name}/
├── PLAN.md          ← Created by this skill
└── stories/         ← Directory created, but files come later via write-stories
```

Examples:

- `docs/plans/002-tenant-foundation/PLAN.md`
- `docs/plans/007-encryption/PLAN.md`
- `docs/plans/009-wallet-domain/PLAN.md`
