---
name: plan-to-tasks
description: Decompose an existing plan into actionable tasks. Use after creating a plan with /skill:write-plan, or when the user wants to break down a plan into tasks, or mentions "plan to tasks" or "create tasks from plan".
---

# Plan to Tasks

Decompose a high-level plan into concrete, actionable tasks.

## Process

1. **Identify the plan** - Ask the user which plan to decompose, or list available plans from `.pi/plans/`
2. **Read the plan** - Load and understand the plan's goals, design, and implementation details
3. **Decompose into tasks** - Break down the plan into small, actionable tasks
4. **Write tasks file** - Create `TASKS.md` in the same directory as the plan

## Task Decomposition Guidelines

### Good Tasks

- **Atomic** - One clear action, completable in a single session
- **Actionable** - Starts with a verb (Add, Create, Update, Remove, Refactor, Test)
- **Specific** - References exact files, functions, or components
- **Ordered** - Dependencies are reflected in task order
- **Testable** - Clear definition of done

### Bad Tasks

- ❌ "Work on authentication" (too vague)
- ❌ "Fix bugs" (not specific)
- ❌ "Refactor everything" (too broad)

### Examples

```markdown
- [ ] Create `AuthService` class in `apps/api/src/modules/auth/auth.service.ts`
- [ ] Add `login` method that validates credentials and returns JWT
- [ ] Add `register` method with email validation
- [ ] Create `AuthController` with POST `/auth/login` endpoint
- [ ] Add unit tests for `AuthService` in `auth.service.spec.ts`
```

## Tasks File Structure

Create `TASKS.md` in the plan directory. This includes implementation details that were intentionally omitted from the high-level plan:

```
.pi/plans/<plan-name>/
├── PLAN.md
└── TASKS.md    # Created by this skill
```

### TASKS.md Format

```markdown
# Tasks: <Plan Title>

> Generated from [PLAN.md](./PLAN.md)

## Implementation Details

Specific implementation details, data structures, APIs, file locations, etc.

## Phase 1: <Phase Name>

- [ ] Task 1
- [ ] Task 2

## Phase 2: <Phase Name>

- [ ] Task 3
- [ ] Task 4

## Verification

- [ ] All tests pass
- [ ] Manual testing completed
- [ ] Documentation updated
```

## Listing Available Plans

To see existing plans:

```bash
ls -la .pi/plans/
```

Or explore the `.pi/plans/` directory to find plans without tasks.
