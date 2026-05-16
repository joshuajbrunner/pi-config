# Multi-Agent Orchestration

Patterns for running multiple agents in parallel cmux panes with coordination.

## Core Pattern

1. Create splits with captured surface refs
2. Launch agent sessions in each split
3. Monitor progress via `read-screen`
4. Coordinate with sync tokens or named buffers
5. Collect results and clean up

## Creating Agent Panes

**Default: panes, not workspaces.** Use `cmux new-split` within the current workspace. Only use `cmux new-workspace` when agents need completely separate project directories.

**Critical: always use `--surface` to target which pane to split.** Without it, cmux splits whichever pane has focus -- leading to recursive halving.

```bash
# Capture the orchestrator's surface
ORIG=$(cmux identify --json | awk -F'"' '/"surface_ref"/{print $4}')

# Create agent panes
S1=$(cmux new-split right | awk '{print $2}')
S2=$(cmux new-split down --surface $S1 | awk '{print $2}')

# Verify topology
cmux tree --json
```

## Launching Agents

```bash
# Launch pi in a split
cmux send --surface $S1 "pi 'implement auth module'\n"

# Launch any command
cmux send --surface $S2 "npm run test:watch\n"
```

## Monitoring Agent Output

```bash
# Read what's on screen in another pane
cmux read-screen --surface $S1

# Poll in a loop
while true; do
  OUTPUT=$(cmux read-screen --surface $S1)
  if echo "$OUTPUT" | grep -q "Task Complete"; then
    break
  fi
  sleep 5
done
```

## Coordination with Sync Tokens

Use tmux-compat `wait-for` for synchronization between panes:

```bash
# In agent pane: signal when done
cmux wait-for -S "agent1-done"

# In orchestrator: wait for signal
cmux wait-for "agent1-done"
```

## Coordination with Named Buffers

Share data between panes using tmux-compat buffers:

```bash
# Agent stores findings
cmux set-buffer api-findings "$(cat findings.json)"

# Another agent retrieves them
FINDINGS=$(cmux paste-buffer api-findings)
```

## Progress Tracking via Sidebar

```bash
# Update status as agents work
cmux set-status agent1 "researching" --color "#007aff"
cmux set-status agent2 "testing" --color "#ff9500"
cmux set-progress 0.5 --label "2/4 agents complete"

# Clear when done
cmux clear-status agent1
cmux clear-status agent2
cmux clear-progress
```

## Notifications for Completion

```bash
# Notify user when parallel work finishes
cmux notify --title "Agents Complete" --body "All 3 agents finished successfully"
```

## Cleanup

```bash
# Close agent panes when done
cmux close-surface --surface $S1
cmux close-surface --surface $S2
```

## Example: Parallel Research

```bash
#!/usr/bin/env bash
set -euo pipefail

ORIG=$(cmux identify --json | awk -F'"' '/"surface_ref"/{print $4}')

# Create 2 agent panes
S1=$(cmux new-split right | awk '{print $2}')
S2=$(cmux new-split down --surface $S1 | awk '{print $2}')

# Update sidebar
cmux set-status research "in progress" --color "#007aff"

# Launch agents
cmux send --surface $S1 "pi 'Research the authentication API and document findings'\n"
cmux send --surface $S2 "pi 'Research the payment API and document findings'\n"

# Monitor (simplified)
echo "Agents launched in $S1 and $S2"
cmux set-progress 0.0 --label "Researching..."
```

## Example: Run Tests While Working

```bash
# Open a test runner in a right split
S1=$(cmux new-split right | awk '{print $2}')
cmux send --surface $S1 "npm run test:watch\n"

# Later, check results
cmux read-screen --surface $S1
```

## Tips

- Always capture surface refs from `new-split` output
- Use `cmux tree --json` to verify layout after creating splits
- Prefer `--focus false` on creation to avoid disrupting the user
- Use sidebar status/progress for visibility into parallel work
- Use `read-screen` to poll agent output without switching focus
- Close agent panes when their work is complete
