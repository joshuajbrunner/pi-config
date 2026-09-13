---
name: terminal-task
description: Explicitly start and manage a server or other long-running terminal command in Herdr without launching another pi session.
disable-model-invocation: true
---

# Terminal Task

Start the command given in the user's arguments in a dedicated Herdr workspace.
Treat explicit instructions about the command, working directory, readiness
signal, layout, and lifetime as authoritative.

This skill controls an ordinary terminal process, not another pi session. Do not
start a pi agent or use `pi-intercom` unless the user separately requests
coordination with an existing pi session.

## Preconditions

1. Confirm Herdr is available:

   ```bash
   test "${HERDR_ENV:-}" = 1
   ```

   If it is unavailable, do not invent another visible-terminal launcher.
   Explain the limitation and stop.

2. Run `herdr --skill` before the first Herdr command in the session.
3. Determine the exact command, working directory, and whether the process
   should remain running. Ask for clarification when the command is ambiguous.
4. Tell the user what will be started and where.

## Workspace

Create a dedicated workspace without changing the user's focus:

```bash
herdr workspace create \
  --cwd <working-directory> \
  --label <descriptive-workspace-name> \
  --no-focus
```

Read the workspace ID and root pane ID from `.result.workspace` and
`.result.root_pane`. Parse returned IDs; never infer them. Never split, move,
resize, or otherwise modify the calling workspace.

A single-pane tab (`1x1`) is the default and is an acceptable final layout. Do
not split merely to fill space. If the user requests multiple related commands,
prefer a new tab for each command. Do not add panes to a tab that was already
split before the current task.

## Start the command

Run the command in the root pane or selected tab:

```bash
herdr pane run <pane-id> '<command>'
```

Pass the intended foreground command without appending `&`; the Herdr pane owns
the process. Keep the user's focus unchanged.

If the user provides a readiness or completion marker, wait for that output:

```bash
herdr pane wait-output <pane-id> \
  --match '<marker>' \
  --timeout <milliseconds>
```

Then inspect relevant output:

```bash
herdr pane read <pane-id> --source recent-unwrapped --lines 120
```

Use a regular expression only when a literal marker is insufficient. A timeout
does not prove that startup failed; inspect the pane before deciding what to do.
Never use `sleep`, timer loops, or repeated status checks to poll readiness.

## Report and lifetime

For a server or watcher, report the workspace, pane, working directory, and any
verified URL or readiness state. Leave it running when it is still needed. Do
not close its pane or workspace merely because the initiating turn is complete.

For a command expected to finish, capture its relevant output before cleanup.
If it fails, report the exit evidence or terminal output rather than silently
restarting it.

When the process is no longer needed, stop it gracefully if it is still running,
inspect the resulting output, and close only the workspace and surfaces created
by this invocation. Never close or rearrange surfaces you did not create.
