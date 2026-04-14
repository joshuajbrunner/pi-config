---
name: implement-task
description: Implement one or more tasks from a plan's TASKS.md file. Use when the user wants to execute tasks, implement features, or mentions "implement task" or "do task". Enforces dependency ordering - blocks tasks whose prerequisites are incomplete.
---

# Implement Task

Implement tasks from a plan's TASKS.md file while respecting dependency ordering.

## Process

1. **Identify the plan** - Ask the user which plan to work from, or list available plans from `.pi/plans/`
2. **Read TASKS.md** - Load the tasks file and parse task status
3. **Identify requested tasks** - Determine which task(s) the user wants to implement
4. **Check dependencies** - Verify all prerequisite tasks are complete
5. **Implement** - Execute the task(s) in order

## Dependency Rules

Tasks have implicit dependencies based on ordering:

1. **Phase ordering** - All tasks in Phase N must be complete before starting Phase N+1
2. **Task ordering within phase** - Tasks are ordered; earlier tasks are prerequisites for later ones
3. **Explicit dependencies** - Tasks may reference other tasks (e.g., "after X is done")

### Dependency Check

Before implementing a task:

```
1. Is this task already complete? → Skip with notice
2. Are all tasks in previous phases complete? → If no, BLOCK
3. Are all earlier tasks in the same phase complete? → If no, BLOCK
4. Dependencies satisfied → Proceed with implementation
```

### Blocking Behavior

When a task is blocked, report:

```markdown
⛔ Cannot implement: "Add user authentication endpoint"

Blocked by incomplete prerequisites:

- [ ] Create User model in `apps/api/src/models/user.ts`
- [ ] Add UserService with CRUD operations

Complete these tasks first, or request them to be implemented together.
```

## Task Selection

The user can specify tasks by:

- **Task number** - "Implement task 3" or "Do tasks 1-3"
- **Task description** - "Implement the auth endpoint task"
- **Phase** - "Implement all Phase 1 tasks"
- **Next** - "Implement the next task" (first incomplete task with satisfied dependencies)

## Implementation Flow

For each task being implemented:

1. **Announce** - State which task is being implemented
2. **Plan** - Briefly outline the implementation approach
3. **Execute** - Write the code, create files, run commands
4. **Verify** - Run relevant tests or checks
5. **Mark complete** - Update TASKS.md to mark task as `[x]`

### Updating TASKS.md

After successful implementation, update the task:

```markdown
# Before

- [ ] Create AuthService class in `apps/api/src/modules/auth/`

# After

- [x] Create AuthService class in `apps/api/src/modules/auth/`
```

## Multiple Tasks

When implementing multiple tasks:

1. Sort by dependency order (phase first, then position)
2. Implement sequentially
3. If any task fails, stop and report
4. Mark each task complete as it's finished

## Example Session

**User:** Implement tasks 2 and 3 from the auth-refactor plan

**Agent:**

```
Reading .pi/plans/auth-refactor/TASKS.md...

Task 2: Create UserService with CRUD operations
Task 3: Add JWT token generation

Checking dependencies...
✓ Task 1 (Create User model) is complete
✓ Task 2 has no blockers
✓ Task 3 depends on Task 2 - will implement in order

Implementing Task 2: Create UserService with CRUD operations
...
```

## Listing Plans and Tasks

```bash
# List available plans
ls .pi/plans/

# View tasks for a specific plan
cat .pi/plans/<plan-name>/TASKS.md
```
