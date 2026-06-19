---
description: Remove completed plans from docs/plans, committing each removal separately
argument-hint: "[plan name or directory]"
---
Clean up old plans that are fully complete, leaving incomplete plans in place.

Optional target from the user (a specific plan name/directory). If empty, consider all plans:

$ARGUMENTS

Follow this process:

1. Discover plans.
   - List plan directories under `docs/plans/` (e.g. `docs/plans/{NNN}-{name}/`).
   - If the user named a specific plan, scope to just that one.
   - If there are no plans, report that and stop.

2. Classify each plan as complete or incomplete.
   - Read each `PLAN.md` and its stories.
   - A plan is **complete** only when its top-level `**Status**` is `✅ Done` (or equivalent "Done"/"Complete") AND every story in the stories table is `✅ Done`.
   - A plan is **incomplete** if the plan status is not done, or any story is not done (`⬜ Not Started`, in progress, blocked, etc.).
   - When status markers are ambiguous or missing, treat the plan as incomplete and explain why.

3. Warn about incomplete plans — do not touch them.
   - For each incomplete plan, list it with the specific reason (e.g. "Story 2.3 still ⬜ Not Started").
   - Make clear these are being skipped intentionally.

4. Confirm before deleting.
   - Show the list of complete plans queued for cleanup.
   - Ask the user to confirm before removing anything, unless they already explicitly authorized deletion.

5. Clean up complete plans one at a time, committing each separately.
   - For each complete plan, do a full cycle before moving to the next:
     - Remove the entire plan directory (`docs/plans/{NNN}-{name}/`).
     - Stage only that plan's changes.
     - Commit with a focused message, e.g. `chore(plans): remove completed plan {NNN}-{name}`.
   - Do not batch multiple plan removals into a single commit.
   - If a commit fails (hooks, etc.), stop and report rather than continuing.

6. Final summary.
   - List each plan removed and its commit.
   - List each incomplete plan skipped and why.
   - Note anything that needs the user's attention.
