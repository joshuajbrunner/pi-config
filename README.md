# Pi Config

Personal collection of pi skills and extensions.

## Installation

```bash
pi install git:github.com/joshuajbrunner/pi-config
```

## Updating

After pushing changes to the repo:

```bash
pi update git:github.com/joshuajbrunner/pi-config
```

Note: `/reload` only reloads local extensions. For git-installed packages, you must run `pi update`.

## Skills

| Skill | Description |
|-------|-------------|
| `brave-search` | Web search and content extraction via Brave Search API |
| `create-extension` | Create pi extensions for projects |
| `create-skill` | Create reusable pi skills |
| `github-issue` | Create GitHub issues using gh CLI |
| `implement-task` | Implement tasks from a plan's TASKS.md file |
| `plan-to-tasks` | Decompose plans into actionable tasks |
| `write-plan` | Interview and document features as structured plans |

## Extensions

| Extension | Description |
|-----------|-------------|
| `pi-cc-patch` | Patches requests for Claude Pro/Max subscription compatibility |
| `policy-self-heal` | Detects provider policy false-positive errors and queues a safe recovery prompt |
| `session-tools` | Save session summaries and browse/resume sessions with summary previews |

### Commands

| Command | Description |
|---------|-------------|
| `/debug-system-prompts` | View logged system prompts for the current session |
| `/policy-self-heal` | Manage policy error self-healing and inspect the last detected event |
| `/summarize [instruction]` | Summarize the current session and save it beside the session JSONL |
| `/session-browser [all]` | Browse sessions with latest saved summary previews and resume the selected session |

## Usage

Skills are automatically available when the package is installed. Reference them with `/skill:<name>` or let pi load them based on task context.

## Installed third-party packages

These aren't part of this repo --- they're installed via `pi install` and tracked in `~/.pi/agent/settings.json`. Listed here for reproducibility on a fresh machine.

Filter syntax in the table:
- `-<file>` --- extension is **disabled** (excluded from load)
- `+<file>` --- **only** that extension is enabled (allowlist; everything else disabled)

| Source | Purpose | Filters |
|---|---|---|
| `npm:pi-powerline-footer` | Powerline-style status footer in the TUI | --- |
| `npm:pi-mcp-adapter` | MCP server bridge | disabled: `index.ts` |
| `npm:@aliou/pi-guardrails` | Safety guardrails for tool calls | only: `src/index.ts` |
| `npm:pi-extmgr` | Extension manager TUI | --- |
| `npm:pi-context` | `context_log` / `context_tag` / `context_checkout` tools | --- |
| `npm:pi-intercom` | Cross-session messaging between pi instances | --- |
| `npm:pi-cache-graph` | Cache usage visualization | --- |
| `npm:pi-cursor-agent` | Cursor editor integration | --- |
| `git:github.com/jonjonrankin/pi-caveman` | Caveman persona extension | disabled: `extensions/caveman.ts` |
| `git:github.com/fluxgear/pi-thinking-steps` | Thinking-step UI rendering | disabled: `index.ts` |

### Reinstall on a fresh machine

```bash
bash scripts/reinstall.sh
```

The script reinstalls every package above and then re-applies the disable/allowlist filters by writing them into `~/.pi/agent/settings.json` via `jq`.

