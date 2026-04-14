---
name: write-plan
description: Interview the user about a plan or feature until reaching shared understanding, then document it as a high-level structured plan. Use when the user wants to plan a feature, design a system, or mentions "write a plan" or "plan this out". Does NOT include tasks - use /skill:plan-to-tasks after to decompose into actionable tasks.
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

Once we have shared understanding, create the plan document:

1. Ask the user for a plan name (kebab-case, e.g., `auth-refactor`, `api-v2`)
2. Create the plan at `.pi/plans/<plan-name>/PLAN.md`

## Plan Structure

```markdown
# <Plan Title>

## Overview

Brief description of what this plan accomplishes.

## Goals

- Goal 1
- Goal 2

## Non-Goals

- What this plan explicitly does NOT cover

## Background

Context and motivation for this plan.

## Design

High-level approach and architecture decisions.

## Open Questions

- Any unresolved questions or decisions to revisit

## References

- Links to related docs, PRs, or resources
```

**Note:** Plans do NOT include tasks. Use `/skill:plan-to-tasks` to decompose a plan into actionable tasks.

## Storage Location

All plans MUST be stored at:

```
.pi/plans/<plan-name>/PLAN.md
```

Examples:

- `.pi/plans/auth-refactor/PLAN.md`
- `.pi/plans/api-v2-migration/PLAN.md`
- `.pi/plans/dashboard-redesign/PLAN.md`

Supporting files (diagrams, research, etc.) go in the same directory:

```
.pi/plans/auth-refactor/
├── PLAN.md
├── architecture-diagram.md
└── research-notes.md
```
