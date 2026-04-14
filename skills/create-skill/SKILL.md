---
name: create-skill
description: Create a pi skill for this project. Use when the user wants to add a reusable capability package with instructions, scripts, or documentation that the agent can load on-demand.
---

# Create Skill

Create pi skills that provide specialized workflows, setup instructions, helper scripts, and reference documentation for specific tasks.

## Skill Locations

| Location              | Scope                         |
| --------------------- | ----------------------------- |
| `.pi/skills/`         | Project-local                 |
| `.agents/skills/`     | Project (cross-tool standard) |
| `~/.pi/agent/skills/` | Global                        |
| `~/.agents/skills/`   | Global (cross-tool standard)  |

## Skill Structure

A skill is a directory with a `SKILL.md` file. Everything else is freeform.

```
my-skill/
├── SKILL.md              # Required: frontmatter + instructions
├── scripts/              # Optional: helper scripts
│   └── process.sh
├── references/           # Optional: detailed docs loaded on-demand
│   └── api-reference.md
└── assets/               # Optional: templates, configs, etc.
    └── template.json
```

## SKILL.md Template

```markdown
---
name: my-skill
description: What this skill does and when to use it. Be specific about the use case.
---

# My Skill

Brief overview of what this skill provides.

## Setup

Run once before first use:
\`\`\`bash
npm install -g some-tool
\`\`\`

## Usage

\`\`\`bash
./scripts/process.sh <input>
\`\`\`

## Examples

\`\`\`bash
./scripts/process.sh input.txt --format json
\`\`\`

See [the reference guide](references/api-reference.md) for details.
```

## Frontmatter Fields

| Field                      | Required | Description                                                                    |
| -------------------------- | -------- | ------------------------------------------------------------------------------ |
| `name`                     | Yes      | Max 64 chars. Lowercase a-z, 0-9, hyphens only. Must match parent directory.   |
| `description`              | Yes      | Max 1024 chars. What the skill does and when to use it.                        |
| `license`                  | No       | License name or reference to bundled file.                                     |
| `compatibility`            | No       | Max 500 chars. Environment requirements.                                       |
| `metadata`                 | No       | Arbitrary key-value mapping.                                                   |
| `disable-model-invocation` | No       | When `true`, skill is hidden from system prompt. Users must use `/skill:name`. |

## Name Rules

- 1-64 characters
- Lowercase letters, numbers, hyphens only
- No leading/trailing hyphens
- No consecutive hyphens
- **Must match parent directory name**

✅ Valid: `pdf-processing`, `data-analysis`, `code-review`, `my-tool-v2`
❌ Invalid: `PDF-Processing`, `-pdf`, `pdf--processing`, `my_skill`

## Description Best Practices

The description determines when the agent automatically loads the skill. Be specific about:

- What the skill does
- When to use it
- What types of tasks it handles

### Good Description

```yaml
description: Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or converting PDFs to other formats.
```

### Poor Description

```yaml
description: Helps with PDFs.
```

## Using Relative Paths

Always use relative paths from the skill directory:

```markdown
Run the setup script:
\`\`\`bash
./scripts/setup.sh
\`\`\`

See [the API reference](references/api.md) for details.
```

The agent resolves paths relative to the SKILL.md location.

## Complete Example

```
brave-search/
├── SKILL.md
├── search.js
└── content.js
```

**SKILL.md:**

```markdown
---
name: brave-search
description: Web search and content extraction via Brave Search API. Use for searching documentation, facts, or any web content. Lightweight, no browser required.
---

# Brave Search

Web search and content extraction using the Brave Search API.

## Setup

\`\`\`bash
cd /path/to/brave-search && npm install
\`\`\`

Set the `BRAVE_API_KEY` environment variable.

## Search

\`\`\`bash
./search.js "query" # Basic search
./search.js "query" --content # Include page content
./search.js "query" --count 20 # More results
\`\`\`

## Extract Page Content

\`\`\`bash
./content.js https://example.com
\`\`\`

Returns clean text content from any URL.
```

## Usage

Skills auto-register as `/skill:name` commands:

```bash
/skill:my-skill           # Load and follow the skill instructions
/skill:my-skill do thing  # Load skill with arguments appended
```

The agent may also auto-load skills based on task context and description matching.

## Tips

1. **Be specific in descriptions** - This determines when the agent loads your skill
2. **Use relative paths** - All paths should be relative to the skill directory
3. **Include setup instructions** - Document any prerequisites or installation steps
4. **Add examples** - Show common usage patterns
5. **Use references/** - Put detailed docs there for on-demand loading (keeps SKILL.md concise)
6. **Test with /skill:name** - Verify the skill loads and works correctly
