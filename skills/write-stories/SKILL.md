---
name: write-stories
description: Flesh out stories for an existing plan. Creates story files with user stories, details, and acceptance criteria. Use after creating a plan with /skill:write-plan, or when the user wants to define stories, or mentions "write stories" or "flesh out the plan".
---

# Write Stories

Take an existing PLAN.md with story titles and create detailed story files with user stories, acceptance criteria, and a subtask placeholder.

## Process

1. **Identify the plan** — Ask which plan to flesh out, or list available plans from `docs/plans/`
2. **Read the PLAN.md** — Load the stories table to see which stories need files
3. **For each story without a file**:
   - Discuss with the user: Who is the actor? What do they want? What does "done" look like?
   - If a story can be defined by examining the codebase/reference docs, do so and propose it
   - Write the story file
4. **Update PLAN.md** — Ensure the stories table links to the new files

## Story File Structure

Each story lives at `docs/plans/{NNN}-{name}/stories/{NNN}-{story-name}.md`:

```markdown
# Story N.X: <Title>

**Status**: ⬜ Not Started

**As a** <actor>
**I want** <capability>
**So that** <benefit>

## Details

Context, design notes, and links to reference docs. Explain the "why" and
any important constraints. Keep it brief — this isn't a spec, it's context
for implementation.

→ [Relevant Reference Doc](../../../reference/path/to/doc.md)

## Acceptance Criteria

- [ ] Criterion 1 — specific, testable, unambiguous
- [ ] Criterion 2
- [ ] Criterion 3

## Subtasks

> Subtasks emerge during implementation. Added as we go.

(none yet)
```

## Guidelines

### Good Acceptance Criteria

- **Specific** — names exact tables, fields, behaviors
- **Testable** — you can write a test or run a command to verify
- **Independent** — each criterion stands alone
- **5-10 per story** — fewer means the story is too vague, more means it's too big

Examples:
```markdown
- [ ] `tenants` table: `id` (bigint PK), `uuid` (unique), `name`, `status`, `created_at`
- [ ] RLS policy uses `current_setting('app.current_tenant')::bigint`
- [ ] Cross-tenant SELECT returns 0 rows (negative test)
- [ ] Missing tenant context returns 401 Unauthorized
```

### Bad Acceptance Criteria

- ❌ "It works" (not testable)
- ❌ "Good error handling" (not specific)
- ❌ "Follow best practices" (not measurable)

### Story Sizing

- A story should be completable in **one focused session** (1-4 hours of work)
- If acceptance criteria exceed 10, split the story
- If a story requires multiple unrelated skills (DB + API + tests), that's fine — but if it's two separate features, split it

### Subtask Section

Always include the subtask placeholder. Subtasks are **never pre-planned** — they emerge during `/skill:implement-story` as implementation progresses.

## Listing Available Plans

```bash
ls docs/plans/
```

To find plans with story titles but no story files:
```bash
# Plans with stories/ directory but few/no files
find docs/plans -name "PLAN.md" -exec grep -l "Not Started" {} \;
```
