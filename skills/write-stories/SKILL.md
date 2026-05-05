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
   - Sketch the acceptance criteria you'd write — don't commit them yet
   - **Check sizing** — see [Story Sizing](#story-sizing) below. If the story is oversized, propose a split, get user approval, and update the plan's stories table **before** writing anything
   - Discuss with the user: Who is the actor? What do they want? What does "done" look like?
   - If a story can be defined by examining the codebase/reference docs, do so and propose it
   - Write the story file
4. **Update PLAN.md** — Ensure the stories table links to the new files (including any splits made during step 3)

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

A story should be completable in **one focused session** (1–2 hours of work). Before writing each story, sketch the acceptance criteria you'd put in it, then run the detection signals below. If any apply, **propose a split before writing**.

#### Detection signals

| Signal | Threshold |
|---|---|
| Acceptance criteria you'd write | > 10 |
| Estimated focused work | > 2 hours |
| Independent deliverables bundled together | > 1 (e.g., "build 8 components", "set up A, B, and C") |
| Title joins items with "and" / commas | "Setup X and Y", "Configure A, B, C" |
| Mixed abstraction layers | infrastructure + UI, or DB schema + API + UI in one story |
| Acceptance criteria fall into 2+ groups with different dependencies | → each group is likely its own story |

A story requiring multiple skills (DB + API + tests) is fine if those layers serve a single feature. The signal isn't "multi-layer," it's "multi-deliverable."

#### Splitting heuristics — find the natural seam

- **Establish vs apply** — first story builds the pattern with one example; later story applies the same pattern to the rest
- **Foundation vs feature** — separate setup/scaffolding from feature work that depends on it
- **Single vs many** — N instances of the same kind of thing → "build the first" + "build the rest"
- **Layer separation** — DB schema, API, UI as distinct stories when each is substantial on its own
- **Establish convention vs follow it** — first story sets the rule (file layout, naming, error shape); later stories just use it

#### Splitting workflow

1. **Propose the split** — give the user new titles, the seam rationale, and the new numbering
2. **Wait for approval** — don't split unilaterally; the user owns scope
3. **Once approved**:
   - Add/renumber rows in the plan's stories table
   - Renumber any already-written story files affected by the split
   - Update the plan's `Out of Scope` or `Decisions` only if the split changes scope
   - Then proceed to discuss and write each new story separately, each within sizing limits

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
