---
name: cmux
description: Control cmux terminal topology, send keys/text to panes, manage workspaces, orchestrate multi-agent sessions, and use notifications/sidebar. Use when operating inside cmux and needing to manipulate windows, workspaces, panes, surfaces, or coordinate parallel terminal sessions.
---

# cmux Terminal Control

Use this skill when operating inside the cmux terminal to manipulate the session, send input to other panes, manage layout, or orchestrate parallel work.

## Am I in cmux?

Check for cmux environment variables:

```bash
[ -n "$CMUX_BUNDLE_ID" ] && echo "In cmux" || echo "Not in cmux"
```

Key environment variables (auto-set when inside cmux):

| Variable | Purpose |
|----------|---------|
| `CMUX_SOCKET_PATH` | Unix socket for CLI communication |
| `CMUX_WORKSPACE_ID` | Current workspace UUID |
| `CMUX_SURFACE_ID` | Current surface (terminal) UUID |
| `CMUX_TAB_ID` | Current tab UUID |
| `CMUX_PANEL_ID` | Current pane UUID |
| `CMUX_BUNDLE_ID` | App bundle identifier (`com.cmuxterm.app`) |
| `CMUX_PORT` | Port for cmux communication |

## Core Concepts

- **Window**: Top-level macOS cmux window
- **Workspace**: Sidebar tab-like group within a window
- **Pane**: Split container in a workspace
- **Surface**: A tab within a pane (terminal or browser)

**Hierarchy**: Window > Workspace > Pane > Surface

**Refs format**: `window:N`, `workspace:N`, `pane:N`, `surface:N` --- always prefer short refs over UUIDs.

## Quick Start

```bash
# Identify current context
cmux identify --json

# View full topology
cmux tree --all
cmux tree --json

# List hierarchy
cmux list-windows
cmux list-workspaces
cmux list-panes
cmux list-pane-surfaces --pane pane:1
```

## Sending Input to Other Terminals

```bash
# Send text (include \n for enter)
cmux send --surface surface:3 "npm test\n"

# Send to caller's own surface
cmux send --surface "${CMUX_SURFACE_ID}" "git status\n"

# Send a single key
cmux send-key --surface surface:3 enter
cmux send-key --surface surface:3 ctrl-c

# Read terminal output from any surface
cmux read-screen --surface surface:3
```

## Creating Splits and Panes

```bash
# Split current pane
cmux new-split right
cmux new-split down

# Split a specific pane
cmux new-split right --panel pane:1

# Create pane with specific content type
cmux new-pane --workspace "${CMUX_WORKSPACE_ID}" --type terminal --direction right
cmux new-pane --workspace "${CMUX_WORKSPACE_ID}" --type browser --direction right --url "http://localhost:3000"

# Create a surface inside an existing pane (as a tab)
cmux new-surface --type terminal --pane pane:1
cmux new-surface --type browser --pane pane:1 --url https://example.com
```

### Capturing Surface Refs

Always capture the returned surface ref for subsequent commands:

```bash
S1=$(cmux new-split right | awk '{print $2}')
# Returns "OK surface:N ..." -- capture surface:N

# Then send commands to it
cmux send --surface $S1 "echo hello\n"
```

### Layout Recipes

**2 panes (side by side)**:
```bash
S1=$(cmux new-split right | awk '{print $2}')
```

**3 panes (one left, two stacked right)**:
```bash
S1=$(cmux new-split right | awk '{print $2}')
S2=$(cmux new-split down --surface $S1 | awk '{print $2}')
```

**4 panes (2x2 grid)**:
```bash
ORIG=$(cmux identify --json | awk -F'"' '/"surface_ref"/{print $4}')
S1=$(cmux new-split right | awk '{print $2}')
S2=$(cmux new-split down --surface $S1 | awk '{print $2}')
S3=$(cmux new-split down --surface $ORIG | awk '{print $2}')
```

## Workspace Management

```bash
# Create new workspace
cmux new-workspace
cmux new-workspace --name "debug auth" --cwd "$PWD"

# Switch workspace (USER-AFFECTING -- only when explicitly asked)
cmux select-workspace --workspace workspace:4

# Rename/close
cmux rename-workspace --workspace "${CMUX_WORKSPACE_ID}" -- "build fix"
cmux close-workspace --workspace workspace:4

# Reorder
cmux reorder-workspace --workspace workspace:4 --before workspace:2
```

## Focus and Navigation

**IMPORTANT**: Never call focus-changing commands unless the user explicitly asks. The user may be looking at a different workspace/window.

```bash
# These are USER-AFFECTING -- only on explicit request:
cmux focus-pane --pane pane:2
cmux focus-panel --panel surface:7
cmux select-workspace --workspace workspace:2
```

## Moving and Organizing Surfaces

```bash
cmux move-surface --surface surface:7 --pane pane:2 --focus false
cmux split-off --surface surface:7 right
cmux reorder-surface --surface surface:7 --before surface:3
cmux close-surface --surface surface:7
```

## Notifications

```bash
# Send a notification
cmux notify --title "Build" --body "Build complete!" --workspace "${CMUX_WORKSPACE_ID}"

# Manage notifications
cmux list-notifications
cmux mark-notification-read --all
cmux dismiss-notification --all-read
```

## Sidebar Status, Progress, and Logs

```bash
# Status pills
cmux set-status build "running" --workspace "${CMUX_WORKSPACE_ID}" --color "#ff9500"
cmux clear-status build --workspace "${CMUX_WORKSPACE_ID}"

# Progress bar
cmux set-progress 0.4 --label "Building" --workspace "${CMUX_WORKSPACE_ID}"
cmux clear-progress --workspace "${CMUX_WORKSPACE_ID}"

# Log entries
cmux log --workspace "${CMUX_WORKSPACE_ID}" --level info -- "Started build"
cmux list-log --workspace "${CMUX_WORKSPACE_ID}"
cmux clear-log --workspace "${CMUX_WORKSPACE_ID}"

# Inspect full sidebar state
cmux sidebar-state --workspace "${CMUX_WORKSPACE_ID}" --json
```

## Visual Cues

```bash
# Flash a surface or workspace for attention
cmux trigger-flash --surface surface:7
cmux trigger-flash --workspace workspace:2
```

## Settings and Config

```bash
# View docs and paths
cmux docs settings
cmux settings path

# Open settings UI
cmux settings
cmux settings cmux-json
cmux settings shortcuts

# Reload config (reloads both cmux.json and Ghostty config)
cmux reload-config
```

Settings live at `~/.config/cmux/cmux.json`. Terminal rendering (font, theme, transparency) belongs in Ghostty config at `~/.config/ghostty/config`.

## Rules

1. **Scope to caller workspace by default** -- use `CMUX_WORKSPACE_ID` and `CMUX_SURFACE_ID`
2. **Never focus-switch without explicit user request** -- the user may be elsewhere
3. **Pass `--focus false`** on move/create commands when possible
4. **Build layout additively** -- prefer `new-pane --type ... --direction ...` over create-then-move chains
5. **Use short refs** (`surface:N`) in commands and chat; UUIDs only for persistence/logging
6. **Reuse helper panes** -- check existing layout before creating more splits

## Deep-Dive References

| Reference | When to Use |
|-----------|-------------|
| [references/cli-commands.md](references/cli-commands.md) | Full CLI command catalog |
| [references/orchestration.md](references/orchestration.md) | Multi-agent patterns and coordination |
| [references/workspace-rules.md](references/workspace-rules.md) | Non-disruptive automation and workspace scoping |
