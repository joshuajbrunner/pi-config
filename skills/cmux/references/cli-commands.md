# cmux CLI Command Reference

Complete catalog of cmux CLI commands grouped by function.

## Global Options

| Option | Purpose |
|--------|---------|
| `--socket <path>` | Override socket path |
| `--password <value>` | Socket password (overrides `CMUX_SOCKET_PASSWORD`) |
| `--json` | Machine-readable JSON output |
| `--id-format <refs\|uuids\|both>` | Handle format in output |
| `--window <id\|ref\|index>` | Route command through a specific window |

## Identity and Topology

```bash
cmux identify --json                    # Current context (workspace, surface, pane)
cmux tree --all                         # Full hierarchy tree
cmux tree --json                        # Machine-readable tree
cmux ping                               # Check socket connectivity
cmux capabilities --json                # Server capabilities
```

## Windows

```bash
cmux list-windows
cmux current-window
cmux new-window
cmux focus-window --window window:2
cmux close-window --window window:2
cmux move-workspace-to-window --workspace workspace:4 --window window:1
```

## Workspaces

```bash
cmux list-workspaces
cmux current-workspace
cmux new-workspace [--name "name"] [--cwd /path] [--command "cmd"]
cmux select-workspace --workspace workspace:4
cmux close-workspace --workspace workspace:4
cmux rename-workspace --workspace workspace:2 -- "new name"
cmux reorder-workspace --workspace workspace:4 --before workspace:2
```

### Workspace Actions

```bash
cmux workspace-action <action> --workspace workspace:2
```

Actions: `pin`, `unpin`, `rename`, `clear-name`, `set-description`, `clear-description`, `move-up`, `move-down`, `move-top`, `close-others`, `close-above`, `close-below`, `mark-read`, `mark-unread`, `set-color`, `clear-color`

## Panes and Surfaces

```bash
# List
cmux list-panes [--workspace workspace:2]
cmux list-pane-surfaces --pane pane:1

# Create splits
cmux new-split right [--panel pane:1] [--surface surface:3]
cmux new-split down [--panel pane:1]

# Create panes
cmux new-pane --type terminal --direction right [--workspace ws:2]
cmux new-pane --type browser --direction down --url "http://..." [--workspace ws:2]

# Create surfaces (tabs within a pane)
cmux new-surface --type terminal --pane pane:1
cmux new-surface --type browser --pane pane:1 --url "http://..."

# Focus (USER-AFFECTING)
cmux focus-pane --pane pane:2
cmux focus-panel --panel surface:7

# Close
cmux close-surface --surface surface:7

# Move
cmux move-surface --surface surface:7 --pane pane:2 [--focus false]
cmux move-surface --surface surface:7 --workspace workspace:2 --window window:1
cmux split-off --surface surface:7 right
cmux drag-surface-to-split --surface surface:7 down

# Reorder
cmux reorder-surface --surface surface:7 --before surface:3
cmux reorder-surface --surface surface:7 --after surface:3
cmux reorder-surface --surface surface:7 --index 0
```

### Tab Actions

```bash
cmux tab-action <action> --surface surface:7
```

Actions: `rename`, `clear-name`, `close-left`, `close-right`, `close-others`, `new-terminal-right`, `new-browser-right`, `reload`, `duplicate`, `pin`, `unpin`, `mark-unread`

```bash
cmux rename-tab --surface surface:7 -- "my tab"
```

## Terminal I/O

```bash
# Send text (use \n for enter)
cmux send "npm test\n"
cmux send --surface surface:3 "git status\n"

# Send single keys
cmux send-key enter
cmux send-key --surface surface:3 ctrl-c
cmux send-key --surface surface:3 tab
cmux send-key --surface surface:3 escape

# Read terminal content
cmux read-screen --surface surface:3
```

## Notifications

```bash
cmux notify --title "Title" --body "Body" [--workspace ws:2]
cmux list-notifications
cmux mark-notification-read --notification <id>
cmux mark-notification-read --all
cmux dismiss-notification --notification <id>
cmux dismiss-notification --all-read
cmux open-notification --notification <id>
cmux jump-to-unread
cmux clear-notifications
```

## Sidebar

```bash
# Status pills
cmux set-status <key> "<value>" [--workspace ws:2] [--color "#hex"] [--icon "name"]
cmux clear-status <key> [--workspace ws:2]
cmux list-status [--workspace ws:2]

# Progress
cmux set-progress <0.0-1.0> [--label "text"] [--workspace ws:2]
cmux clear-progress [--workspace ws:2]

# Log
cmux log [--workspace ws:2] [--level info|warn|error] -- "message"
cmux list-log [--workspace ws:2]
cmux clear-log [--workspace ws:2]

# Full state
cmux sidebar-state [--workspace ws:2] --json
```

## Right Sidebar

```bash
cmux right-sidebar toggle|show|hide
cmux right-sidebar focus
cmux right-sidebar set <files|find|vault|sessions|feed|dock>
cmux right-sidebar mode    # prints JSON with visible + mode
```

## Visual Cues and Health

```bash
cmux trigger-flash --surface surface:7
cmux trigger-flash --workspace workspace:2
cmux surface-health [--workspace ws:2]
cmux refresh-surfaces
```

## Config and Settings

```bash
cmux docs [settings|shortcuts|api|browser|agents|dock]
cmux settings [open [target]|path|docs]
cmux config doctor [--path <file>]    # validate config
cmux config reload                     # reload config (same as reload-config)
cmux reload-config                     # reloads cmux.json + Ghostty config
```

## Themes

```bash
cmux themes                  # interactive picker (in TTY)
cmux themes list             # list available themes
cmux themes set <theme>      # set for both light/dark
cmux themes set --light <theme>
cmux themes set --dark <theme>
cmux themes clear            # remove override
```

## Events Stream

```bash
cmux events                                    # stream all events as NDJSON
cmux events --name workspace.selected          # filter by event name
cmux events --category navigation              # filter by category
cmux events --reconnect                        # auto-reconnect
cmux events --after <seq>                      # resume from sequence
cmux events --cursor-file ./cursor.json        # persist cursor
cmux events --limit 10                         # exit after N events
```

## tmux Compatibility Commands

For scripts migrating from tmux:

```bash
cmux capture-pane          # read pane text
cmux resize-pane           # resize with direction flags
cmux wait-for <channel>    # signal/wait sync point
cmux swap-pane             # swap two panes
cmux break-pane            # move pane to new workspace
cmux join-pane             # join pane into another
cmux set-buffer <name> <text>   # named buffer
cmux paste-buffer <name>        # paste from buffer
cmux list-buffers               # list buffers
cmux display-message "text"     # print/display message
```

## Agent Integrations

```bash
cmux hooks setup                    # install hooks for all detected agents
cmux hooks setup --agent pi         # install for specific agent
cmux hooks uninstall                # remove all hooks
cmux hooks <agent> install          # install for one agent
cmux hooks <agent> uninstall        # remove for one agent
cmux hooks feed --source <agent>    # convert hook events to Feed
```

Supported agents: `claude`, `codex`, `opencode`, `pi`, `amp`, `cursor`, `gemini`, `rovodev`, `copilot`, `codebuddy`, `factory`, `qoder`

## SSH and Remote

```bash
cmux ssh <user@host>          # SSH workspace
cmux vm ls                    # list VMs
cmux vm new [--image ...]     # create VM
cmux vm shell <id>            # attach to VM
cmux vm ssh <id>              # SSH workspace for VM
cmux vm exec <id> "cmd"       # run command in VM
cmux vm rm <id>               # destroy VM
```

## Auth

```bash
cmux auth status [--json]
cmux auth login
cmux auth logout
```
