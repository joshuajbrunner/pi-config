---
name: github-issue
description: Create GitHub issues using the gh CLI tool. Use when filing bug reports, feature requests, or issues. Follows a structured template with description, root cause, steps to reproduce, and suggested fix.
---

# GitHub Issue

Create structured GitHub issues using the `gh` CLI.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth status`)

## Before Filing

**Always ask the user which repository** to file the issue on if not specified. Do not assume.

## Issue Template

```markdown
## Description

[Concise summary of the issue - what's happening and where]

## Root Cause

[Technical explanation with relevant code snippets if applicable]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Observed behavior]

## Suggested Fix

[Proposed solution with code example if applicable]
```

## Usage

```bash
gh issue create --repo <owner/repo> --title "<title>" --body "<body>"
```

### With Labels

```bash
gh issue create --repo <owner/repo> --title "<title>" --body "<body>" --label "bug"
```

### Interactive Mode

```bash
gh issue create --repo <owner/repo>
```

## Guidelines

1. **Keep titles concise** - Under 80 characters, describe the problem
2. **Be specific** - Include file paths, function names, error messages
3. **Include code** - Use fenced code blocks with language hints
4. **Suggest fixes** - When possible, propose a solution
5. **Skip sections** - Omit Root Cause or Suggested Fix if unknown/not applicable

## Example

```bash
gh issue create --repo mariozechner/pi \
  --title "TUI artifacts in extension config panel with multi-line descriptions" \
  --body "## Description

When configuring extensions with multi-line descriptions, the TUI displays visual artifacts.

## Steps to Reproduce

1. Run \`/extensions\`
2. Press \`c\` to configure an extension with multi-line description
3. Text breaks across lines incorrectly

## Suggested Fix

Normalize newlines in \`readSummary()\`:
\`\`\`typescript
text.replace(/[\r\n]+/g, ' ').trim()
\`\`\`" \
  --label "bug"
```
