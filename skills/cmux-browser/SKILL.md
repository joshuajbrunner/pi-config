---
name: cmux-browser
description: Browser automation with cmux. Open sites, interact with pages via snapshot refs, fill forms, wait for state changes, and extract data from cmux browser surfaces. Use when needing to browse the web, test UIs, or automate browser interactions inside cmux.
---

# cmux Browser Automation

Use this skill for browser tasks inside cmux webviews. cmux embeds WebKit-based browser surfaces that can be controlled via CLI.

## Core Workflow

1. Open or target a browser surface
2. Wait for page load
3. Snapshot (`--interactive`) to get element refs
4. Act with refs (`click`, `fill`, `type`, `select`, `press`)
5. Wait for state changes
6. Re-snapshot after DOM/navigation changes

```bash
# Open a browser surface
cmux --json browser open https://example.com
# Returns surface ref, e.g., surface:7

# Wait for load, snapshot, interact
cmux browser surface:7 wait --load-state complete --timeout-ms 15000
cmux browser surface:7 snapshot --interactive
cmux browser surface:7 fill e1 "hello"
cmux --json browser surface:7 click e2 --snapshot-after
```

## Opening Browser Surfaces

```bash
# Open in caller's workspace (uses CMUX_WORKSPACE_ID)
cmux browser open https://example.com --json

# Open in a specific workspace
cmux browser open https://example.com --workspace workspace:2 --json

# Open as a split pane
cmux new-pane --workspace "${CMUX_WORKSPACE_ID}" --type browser --direction right --url "https://example.com"
```

## Snapshot and Element Refs

Instead of CSS selectors, cmux uses snapshot-based refs (`e1`, `e2`, etc.):

```bash
# Take a snapshot to get refs
cmux browser surface:7 snapshot --interactive

# Output shows elements with refs:
# [ref=e1] <input placeholder="Email">
# [ref=e2] <input type="password">
# [ref=e3] <button>Submit</button>

# Use refs directly
cmux browser surface:7 fill e1 "user@example.com"
cmux browser surface:7 fill e2 "password123"
cmux browser surface:7 click e3
```

### Ref Lifecycle

Refs are **invalidated** when page structure changes. Always re-snapshot after:
- Navigation
- Modal open/close
- Major DOM changes
- Clicking buttons that modify the page

```bash
# Use --snapshot-after on mutating actions
cmux --json browser surface:7 click e3 --snapshot-after
```

### Large Pages

```bash
# Scope snapshot to a section
cmux browser surface:7 snapshot --selector "form#checkout" --interactive

# Compact output
cmux browser surface:7 snapshot --interactive --compact --max-depth 3
```

## Navigation

```bash
cmux browser surface:7 goto https://example.com/page
cmux browser surface:7 back
cmux browser surface:7 forward
cmux browser surface:7 reload
cmux browser surface:7 get url
cmux browser surface:7 get title
```

## Interaction Commands

```bash
# Click/hover
cmux browser surface:7 click <ref-or-selector>
cmux browser surface:7 dblclick <ref>
cmux browser surface:7 hover <ref>

# Text input
cmux browser surface:7 fill <ref> "text"     # set value (clears first)
cmux browser surface:7 fill <ref> ""          # clear input
cmux browser surface:7 type <ref> "text"      # type character by character

# Keyboard
cmux browser surface:7 press Enter
cmux browser surface:7 press Tab
cmux browser surface:7 key ctrl+a

# Select/checkbox
cmux browser surface:7 select <ref> "option-value"
cmux browser surface:7 check <ref>
cmux browser surface:7 uncheck <ref>

# Scroll
cmux browser surface:7 scroll --dy 400
cmux browser surface:7 scroll --selector ".list" --dy 200
```

## Wait Patterns

```bash
cmux browser surface:7 wait --selector "#ready" --timeout-ms 10000
cmux browser surface:7 wait --text "Success" --timeout-ms 10000
cmux browser surface:7 wait --url-contains "/dashboard" --timeout-ms 10000
cmux browser surface:7 wait --load-state complete --timeout-ms 15000
cmux browser surface:7 wait --function "document.readyState === 'complete'" --timeout-ms 10000
```

## Data Extraction

```bash
cmux browser surface:7 get text body
cmux browser surface:7 get text "#content"
cmux browser surface:7 get html body
cmux browser surface:7 get value "#email"
cmux browser surface:7 get attr "#link" --attr href
cmux browser surface:7 get count ".row"
cmux browser surface:7 get box "#submit"
cmux browser surface:7 eval 'document.title'
```

## Common Flows

### Form Submission

```bash
cmux --json browser open https://app.example.com/signup
cmux browser surface:7 wait --load-state complete --timeout-ms 15000
cmux browser surface:7 snapshot --interactive
cmux browser surface:7 fill e1 "Jane Doe"
cmux browser surface:7 fill e2 "jane@example.com"
cmux --json browser surface:7 click e3 --snapshot-after
cmux browser surface:7 wait --url-contains "/welcome" --timeout-ms 15000
cmux browser surface:7 snapshot --interactive
```

### Login Flow

```bash
cmux --json browser open https://app.example.com/login
cmux browser surface:7 wait --load-state complete --timeout-ms 15000
cmux browser surface:7 snapshot --interactive
cmux browser surface:7 fill e1 "user@example.com"
cmux browser surface:7 fill e2 "$APP_PASSWORD"
cmux browser surface:7 click e3 --snapshot-after --json
cmux browser surface:7 wait --url-contains "/dashboard" --timeout-ms 20000

# Save auth state for reuse
cmux browser surface:7 state save ./auth-state.json
```

### Restore Auth State

```bash
cmux --json browser open https://app.example.com
cmux browser surface:8 state load ./auth-state.json
cmux browser surface:8 goto https://app.example.com/dashboard
```

### Stable Agent Loop (Recommended)

```bash
# navigate -> verify -> wait -> snapshot -> action -> re-snapshot
cmux browser surface:7 get url
cmux browser surface:7 wait --load-state complete --timeout-ms 15000
cmux browser surface:7 snapshot --interactive
cmux --json browser surface:7 click e5 --snapshot-after
cmux browser surface:7 snapshot --interactive
```

If `get url` returns empty or `about:blank`, navigate first.

## Session and Cookies

```bash
# Cookies
cmux browser surface:7 cookies get
cmux browser surface:7 cookies set session_token "abc123"
cmux browser surface:7 cookies clear

# Storage
cmux browser surface:7 storage local get "key"
cmux browser surface:7 storage local set "key" "value"
cmux browser surface:7 storage session clear

# State save/load (full session)
cmux browser surface:7 state save ./state.json
cmux browser surface:7 state load ./state.json
```

## Diagnostics

```bash
cmux browser surface:7 console list          # console messages
cmux browser surface:7 errors list           # JS errors
cmux browser surface:7 highlight <selector>  # highlight element
cmux browser surface:7 screenshot            # save screenshot
```

## Browser Tabs

```bash
cmux browser surface:7 tab list
cmux browser surface:7 tab new https://other.com
cmux browser surface:7 tab switch 2
cmux browser surface:7 tab close 2
```

## Tips

- Always snapshot before interacting
- Use `--snapshot-after` on mutating actions to get fresh refs
- Re-snapshot after any navigation or DOM change
- Use `--timeout-ms` on all wait commands
- Prefer `get url` to verify you're on the expected page before acting
- Use element refs (`e1`, `e2`) instead of CSS selectors when possible
- Scope snapshots with `--selector` for large/complex pages

## Deep-Dive References

| Reference | When to Use |
|-----------|-------------|
| [references/commands.md](references/commands.md) | Full browser command mapping |
| [references/snapshot-refs.md](references/snapshot-refs.md) | Ref lifecycle and troubleshooting |
| [references/authentication.md](references/authentication.md) | Login/OAuth/2FA patterns |
