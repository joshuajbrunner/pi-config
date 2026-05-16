# Workspace Rules and Non-Disruptive Automation

Guidelines for operating safely within a cmux workspace without disrupting the user.

## Default Rule

**Scope all actions to the current caller workspace** unless the user explicitly asks for another workspace, another window, or global state.

Do not assume the visually focused workspace is the right target. An agent can be running in one workspace while the user is looking at another.

```bash
# Always start by identifying your context
printf 'workspace=%s\nsurface=%s\nsocket=%s\n' \
  "${CMUX_WORKSPACE_ID:-}" \
  "${CMUX_SURFACE_ID:-}" \
  "${CMUX_SOCKET_PATH:-}"
cmux identify --json
```

## Non-Disruptive Automation

The user may be visually focused on a different workspace, window, or app while an agent works. **Treat layout and focus as separate concerns.**

### Never call these without explicit user ask:

- `select-workspace` -- switches the visible sidebar tab
- `focus-pane` / `focus-panel` -- yanks pane or surface focus
- `tab-action` with focus-changing actions

These are **user-affecting actions**. The rule applies even inside the caller's own workspace.

### Build layout additively

Prefer commands that create a new pane already populated with the right content:

```bash
# Good: pane and content in one call
cmux new-pane --workspace "${CMUX_WORKSPACE_ID}" --type browser --direction right --url "http://localhost:3000"
cmux new-pane --workspace "${CMUX_WORKSPACE_ID}" --type terminal --direction down

# Bad: create-then-move-then-focus chains
```

### Always pass `--focus false`

When the command supports it:

```bash
cmux move-surface --surface surface:7 --pane pane:2 --focus false
cmux new-surface --pane pane:2 --type terminal --focus false
```

## Right-Side Helper Pane Pattern

When opening auxiliary output (preview, logs, browser checks), reuse a helper pane:

```bash
# Check existing layout
cmux list-panes --workspace "${CMUX_WORKSPACE_ID}" --json
cmux list-pane-surfaces --workspace "${CMUX_WORKSPACE_ID}" --json
```

Policy:
- If a helper pane already exists to the right, add new surfaces to it as tabs
- If no helper pane exists, create exactly one:
  ```bash
  cmux new-pane --workspace "${CMUX_WORKSPACE_ID}" --type terminal --direction right --focus false
  ```
- Repeated "open it" requests should create tabs in the existing helper pane, not more splits

## Explicit Workspace Flags

Always use explicit workspace flags even when env vars are set. It makes automation auditable:

```bash
# Good: explicit
cmux new-pane --workspace "${CMUX_WORKSPACE_ID}" --type terminal --direction right

# Risky: implicit (may target focused workspace in another window)
cmux new-pane --type terminal --direction right
```

## Error Handling

If a CLI command rejects a valid surface or pane ref:
1. **Report the failure to the user**
2. **Do not work around by focusing**
3. Do not call `focus-pane` or `focus-panel` to recover

## Rules Summary

1. Work in the current caller workspace by default
2. Use `CMUX_WORKSPACE_ID`, `CMUX_SURFACE_ID`, and `CMUX_SOCKET_PATH` before focused-window fallbacks
3. Prefer explicit `--workspace` and `--surface` flags for mutating actions
4. Never call focus-changing commands unless explicitly asked
5. Pass `--focus false` on move/create commands
6. Reuse the right-side helper pane; create one only if it doesn't exist
7. Build layout additively rather than create-then-move-then-focus
8. Use short refs for commands; UUIDs only for persistence/logging
9. Do not close, focus, move, or send input to another workspace unless the user names that target
