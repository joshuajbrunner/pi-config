---
description: Show the current code, work, or discussion as a concise Unicode tree
argument-hint: "[code path, feature/tasks, or topic]"
---
Show the subject below as a concise Unicode tree. If no subject is
provided, use the code, work, or topic we are currently discussing.

Subject: $ARGUMENTS

Choose the appropriate view:
- Code: show the relevant call path, from entry point to the functions
  it calls. Label it “Static call path” unless runtime evidence is
  available. Include repository-relative source paths, line numbers
  when known, and each file’s role.
- Tracked work: show the relevant parent issue, features, and tasks,
  with their current statuses and recorded dependencies. Identify
  the next ready task when the evidence supports it.
- Other topics: show the hierarchy or flow that best explains the
  discussion.

Verify relationships against available source code, tracker data,
or conversation evidence. Do not invent calls, dependencies, statuses,
or ordering. Clearly distinguish verified facts from proposed structure.
Ask one focused question only if the subject is genuinely ambiguous.

Output:
1. One short sentence stating the main takeaway.
2. A Unicode tree in a fenced code block, using branches such as
   ├──, └──, and │.
3. A short legend and essential caveats, only when needed.

Keep the tree focused on the requested branch, not the entire project.
Use nesting for parent/child relationships or calls. Show dependencies
explicitly with ─▶ and explain its meaning; sibling order alone must
not imply execution order or a dependency.

For tracked work:
- Use capitalized issue types and exact titles, not IDs.
- Use ✓ closed, ◐ in progress, ○ open, and explicit labels for
  other statuses.
- Mark the next verified ready task with “◀ next (ready)”.
- Distinguish recorded dependencies from suggested sequencing.

This is an explanation request: do not modify code, change issue
statuses, or start the work.
