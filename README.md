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

### Commands

| Command | Description |
|---------|-------------|
| `/debug-system-prompts` | View logged system prompts for the current session |

## Usage

Skills are automatically available when the package is installed. Reference them with `/skill:<name>` or let pi load them based on task context.
