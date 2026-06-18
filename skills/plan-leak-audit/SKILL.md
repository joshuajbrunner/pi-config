---
name: plan-leak-audit
description: Audit shipped artifacts (code, config, dotfiles, committed docs, commit messages) for leaked planning vocabulary before committing plan-driven work. Use after implementing stories/tasks from a plan, when reviewing a diff that touches files produced from a plan, or whenever the user mentions plan/story context leaking into comments or docs. Detects and removes story/task IDs, internal pattern labels, and plan-relative phrasing.
---

# Plan Leak Audit

Planning documents (plans, stories, tasks, design notes) and the artifacts they
produce (code, config, dotfiles, committed reference docs, commit messages) have
different audiences. Plan-internal vocabulary must never leak into shipped files,
because a future reader has only the file --- not the plan that motivated it.

This skill finds and removes that leakage.

## What counts as leakage

Inside shipped files (everything OUTSIDE the planning directory, e.g. not under
`docs/plans/`, `tasks/`, `.stories/`):

- **Story/task/plan identifiers** --- "Story 1.4", "Phase 2", "Task 3", ticket
  numbers, "see the plan", "per the design doc".
- **Plan-internal labels** --- "Pattern A/B", "Approach 1", "Option 2", "the new
  design", "the old approach" used as a *named concept* rather than described.
- **Decision-history phrasing** --- comments explaining *why a plan chose this*
  instead of *what the code does*.

NOT leakage (leave these):

- User-facing **deprecation notices** in READMEs/reference docs ("the old X
  approach has been removed").
- A reference doc that **defines** a term and then uses it consistently (self-
  contained). Prefer descriptive names anyway, but this is judgement, not a bug.
- Anything inside the planning directory itself.

## Workflow

1. **Identify the planning directory** for the project (commonly `docs/plans/`,
   `docs/stories/`, `tasks/`, `.agents/plans/`). Everything else is "shipped".

2. **Grep the working tree** (or just the staged diff) for plan vocabulary,
   excluding the planning directory:

   ```bash
   ./scripts/audit.sh                 # scan whole tree, auto-detect plan dir
   ./scripts/audit.sh docs/plans      # scan tree, treat this path as plan dir
   ./scripts/audit.sh --staged        # scan only staged changes
   ```

   The script reports each hit with file:line and a category, and exits non-zero
   if any leakage is found (so it can gate a commit).

3. **Triage each hit** against the "NOT leakage" list above. Genuine deprecation
   notices and self-contained definitions stay.

4. **Rewrite, don't just delete.** Replace the leaked reference with what the
   code/config actually does:
   - "(Story 1.4)" -> name the real mechanism or source ("stored by the
     `run_once_after_15` bootstrap script").
   - "Pattern B wrapper" -> "per-process injecting wrapper (`op run --env-file`)".
   - "the new design resolves..." -> "resolves...".

5. **Re-run the audit** until clean (or only intentional deprecation notices
   remain), then verify the files still render/parse (templates, `sh -n`, etc.).

6. **Check the commit message too** --- it ships in history. Describe the change,
   not the story number.

## Quick one-liner

Without the script, the core check is:

```bash
rg -n --glob '!docs/plans/**' -i \
  '\b(story|phase|task) [0-9]|\bpattern [ab]\b|\bapproach [0-9]|\bthe plan\b|per the (plan|design)' .
```

Adjust the `--glob` exclusion to match the project's planning directory.
