---
name: implement-story
description: Implement one or more stories from a plan. Use when the user wants to execute stories, implement features, or mentions "implement story" or "do story" or "next story". Enforces dependency ordering - blocks stories whose prerequisites are incomplete.
---

# Implement Story

Implement stories from a plan while respecting dependency ordering. Tracks progress through subtasks.

## Process

1. **Identify the plan** — Ask which plan to work from, or list available plans from `docs/plans/`
2. **Read PLAN.md** — Parse the stories table and their statuses
3. **Identify target story** — Which story does the user want to implement?
4. **Check dependencies** — Verify prerequisite stories/phases are complete
5. **Read the story file** — Load acceptance criteria
6. **Implement** — Walk through each acceptance criterion, adding subtasks as you go
7. **Mark complete** — Update story status + PLAN.md table

## Dependency Rules

### Phase Dependencies

- All stories in Phase N must be ✅ before starting any story in Phase N+1
- Check by reading the PLAN.md of the dependent phase

### Story Dependencies (within a phase)

- Stories are ordered; earlier stories are prerequisites for later ones
- Story N.1 must be ✅ before starting N.2

### Blocking Behavior

When a story is blocked:

```markdown
⛔ Cannot implement Story 2.2: "Tenant Context Propagation"

Blocked by incomplete prerequisites:
- Story 2.1: "Tenant Model & RLS Isolation" (⬜ Not Started)

Complete this story first, or request it to be implemented together.
```

## Story Selection

The user can specify stories by:

- **Number** — "Implement story 2.1" or "Do story 3"
- **Title** — "Implement the tenant context story"
- **Next** — "Next story" (first incomplete story with satisfied dependencies)
- **Phase** — "Implement all Phase 2 stories" (sequential)

## Implementation Flow

For each story, work through acceptance criteria incrementally. Explain reasoning behind decisions, record subtasks as you go.

### Step-by-step:

1. **Announce** — State which story and criterion you're working on
2. **Explain** — Briefly describe the approach and any trade-offs
3. **Implement** — Write the code, create files, run commands
4. **Verify** — Run relevant tests or demonstrate it works
5. **Record subtask** — Add the completed subtask to the story file
6. **Repeat** — Move to next acceptance criterion

### Adding Subtasks

As you implement, add completed subtasks to the story file's Subtasks section:

```markdown
## Subtasks

- [x] Created `src/shared/infrastructure/tenant/tenant.interceptor.ts` with `SET LOCAL` logic
- [x] Installed `nestjs-cls` and registered `ClsModule` in `AppModule`
- [x] Added integration test `test/integration/tenant-isolation.int-spec.ts`
- [x] Verified cross-tenant query returns 0 rows
- [ ] Add error handling for missing tenant claim in JWT
```

Subtasks should capture:
- What file was created/modified
- What was tested
- Any decisions made during implementation
- Any remaining work discovered

## Completing a Story

When all acceptance criteria are met:

1. **Update story file** — Set status to `✅ Done`, add the commit message reference
2. **Update PLAN.md** — Change story status in the table from `⬜` to `✅ Done`
3. **Commit** — All work for a story should be committed with a descriptive message

### Story file after completion:

```markdown
# Story 2.1: Tenant Model & RLS Isolation

**Status**: ✅ Done
**Commit**: `feat: add tenant model with rls isolation`

**As a** platform operator
...
```

### PLAN.md table after completion:

```markdown
| # | Story | Status |
|---|-------|--------|
| 2.1 | [Tenant Model & RLS](./stories/001-tenant-model-rls.md) | ✅ Done |
| 2.2 | [Tenant Context](./stories/002-tenant-context-cls.md) | ⬜ Not Started |
```

## Listing Plans and Stories

```bash
# List available plans
ls docs/plans/

# View a specific plan's stories
cat docs/plans/002-tenant-foundation/PLAN.md

# Find incomplete stories
grep -r "⬜\|🟡" docs/plans/*/PLAN.md
```
