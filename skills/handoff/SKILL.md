---
name: handoff
description: Compact the current conversation into a timestamped handoff document for another agent or session to pick up. Use when context must move between sessions, harnesses, directories, collaborators, or parallel work.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

# Handoff

Write a handoff document summarising the current conversation so a fresh agent can continue the work.

## Destination

Use Pi's current session file to locate the artifact directory.

1. Run `printf '%s' "$PI_SESSION_FILE"` with the Bash tool.
2. If it is non-empty, remove the `.jsonl` suffix to derive the session-specific artifact directory:

   ```bash
   session_file="$PI_SESSION_FILE"
   artifact_dir="${session_file%.jsonl}"
   mkdir -p "$artifact_dir"
   ```

3. Save the handoff inside `artifact_dir`.
4. Name it `handoff-YYYY-MM-DDTHH-mm-ssZ.md`, using the current UTC timestamp.

Pi normally stores sessions like this:

```text
~/.pi/agent/sessions/<encoded-project-path>/
├── <timestamp>_<session-id>.jsonl
└── <timestamp>_<session-id>/
    └── handoff-<timestamp>.md
```

The sidecar directory may not exist yet; create it with `mkdir -p`.

If `PI_SESSION_FILE` is empty, the session is ephemeral. Save the artifact in the operating system's temporary directory instead. Report the artifact's absolute path after writing it.

## Beads integration

Check whether `.beads/` exists in the project root. If necessary, find the project root with `git rev-parse --show-toplevel`; if the directory is not a Git repository, use the current working directory.

- If `.beads/` does not exist, do not mention or use Beads. Continue with normal handoff behavior.
- If `.beads/` exists, include relevant Beads (`br`) issue IDs, statuses, dependencies, and relationships when they are part of the current work.
- Reference Beads issues by ID instead of duplicating their contents.
- Do not create or modify Beads issues unless the user explicitly asks.

## Handoff contents

Include:

- The purpose of the next session
- The current goal and work in progress
- Important decisions and their rationale
- Work completed
- Work still needed
- Relevant files, paths, artifacts, commits, URLs, and Beads IDs
- A `## Suggested skills` section naming skills the next agent should invoke

Do not duplicate content already captured in specs, plans, ADRs, issues, commits, diffs, or Beads issues. Reference those artifacts by path, URL, or ID instead.

Redact sensitive information, including API keys, passwords, tokens, and personally identifiable information.

If the user supplied an argument, treat it as the description of what the next session will focus on and tailor the handoff accordingly.
