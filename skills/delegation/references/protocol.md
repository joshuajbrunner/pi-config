# Delegation Protocol

This protocol is for the controlling session. Spawned sessions receive a compact
task and communication brief; they do not load this protocol or the role skill.
The controlling session remains responsible for coordination, verification,
synthesis, and cleanup.

## Preconditions

1. Confirm Herdr is available:

   ```bash
   test "${HERDR_ENV:-}" = 1
   ```

   If it is unavailable, do not invent another launcher. Explain the limitation
   and stop.

2. Run `herdr --skill` before the first Herdr command in the session.
3. Load the `pi-intercom` skill before coordinating sessions. Ignore any
   `pi-subagents` guidance in that skill: never use `pi-subagents`, and never
   allow a spawned session to delegate further.
4. Announce what you are launching and why before creating it.

## Workspace layout

Create a dedicated workspace without changing the user's focus. Never split,
move, resize, or otherwise modify the calling session's workspace:

```bash
herdr workspace create \
  --cwd "$PWD" \
  --label <descriptive-workspace-name> \
  --no-focus
```

Read the workspace ID and first tab's root pane ID from `.result.workspace` and
`.result.root_pane`. Parse returned IDs; never infer them.

Use the root pane for the first session. A single-pane tab (`1x1`) is an
acceptable final layout; never split merely to fill space. Do not add panes to a
tab that was already split before the current task. Create a new tab instead.

Prefer additional tabs over pane splits. Create a tab for an independent
workstream:

```bash
herdr tab create \
  --workspace <workspace-id> \
  --cwd "$PWD" \
  --label <descriptive-tab-name> \
  --no-focus
```

Read its root pane ID from `.result.root_pane`.

Split a fresh task tab only when closely related sessions benefit from remaining
visible together. Prefer an equal `1x2` layout:

```bash
herdr pane split \
  --pane <root-pane-id> \
  --direction right \
  --ratio 0.5 \
  --cwd "$PWD" \
  --no-focus
```

Read the right pane ID from `.result.pane.pane_id`. Use `2x2` only when laying
out a fresh tab for four closely related sessions. After the right split, split
the root and right panes downward with `--ratio 0.5`, reading each returned pane
ID. The only permitted final layouts are `1x1`, `1x2`, and `2x2`.

## Start sessions

Start pi in each selected pane with the model and thinking level specified by
the invoked role skill:

```bash
herdr agent start <name> --kind pi --pane <pane-id> -- \
  --model <provider/model>:<thinking> --name <name>
```

Use a unique descriptive name matching `<role>-<topic>`. Confirm the session is
live with `intercom({ action: "list" })`, then send its brief.

## Briefing contract

Brief every session independently. Do not rely on spawned sessions discovering
one another or loading orchestration instructions. Include:

- the goal and definition of done
- constraints and anything it must not touch
- relevant files and verification commands
- the expected response shape
- the controlling session's intercom name
- a prohibition on further delegation
- where intentional task outputs belong
- instructions to keep temporary coordination artifacts outside the project
- this communication contract:

  > Report blockers, material progress, and completion to `<controller-name>`
  > through `pi-intercom`. If this assignment arrived through `ask`, answer with
  > `reply`; otherwise report with `send`. Use `ask` only when a decision is
  > required before continuing. Do not delegate further.

The brief provides all routine communication instructions. Do not tell spawned
sessions to load the role skill, this protocol, or the full `pi-intercom` skill.
They may load `pi-intercom` only if communication fails or requires
troubleshooting.

## Communication and waiting

Use `ask` when a result is required synchronously and the work is expected to
finish within its timeout. The spawned session must answer with `reply`.

For longer work, use `send`. The spawned session must report progress, blockers,
and completion with `send`. Continue independent work or end the current turn
and rely on the inbound report. Never use `sleep`, timer loops, or repeated
`list`, `status`, Herdr, agent, or pane checks merely to determine whether a
session has finished. Use `list` for target discovery and `status` for
troubleshooting, not completion polling.

## Temporary artifacts

Prefer direct `pi-intercom` messages or attachments for small results. Do not
place scratch files, transcripts, logs, screenshots, exported results, or
oversized inter-session handoffs in the project working directory. Create a
unique temporary directory instead:

```bash
artifact_dir="$(mktemp -d "${TMPDIR:-/tmp}/pi-delegate.XXXXXX")"
```

Use project paths only for intentional task outputs or repository changes. Send
an artifact's absolute path over `pi-intercom`. The session that created the
temporary directory removes it after the controlling session confirms it is no
longer needed.

## Cleanup

After capturing all results, close the sessions and dedicated workspace unless
the user wants them kept. Never close or rearrange panes, tabs, or workspaces
you did not create. Summarize outcomes rather than pasting raw transcripts.
