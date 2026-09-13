---
name: delegate
description: Launch and coordinate additional pi sessions inside Herdr for research, implementation, paired review, or a one-on-one discussion with a peer model. Use when starting another agent, delegating work, running parallel research, requesting a review, or when the user says "use another agent", "delegate this", "spin up a separate pi session", "discuss this with astra/fable", or "have another agent review/implement this". Requires HERDR_ENV=1.
---

# Delegate

Coordinate additional pi sessions from inside Herdr. The calling session stays
the owner: it briefs the delegates, collects results over `pi-intercom`, and
reports a synthesis to the user. Delegated sessions never delegate further.

## Roles and models

| Role           | Model                        | Thinking | Sessions                          |
|----------------|------------------------------|----------|-----------------------------------|
| Research       | `openai-codex/gpt-5.6-luna`  | low      | 1+, non-overlapping questions     |
| Implementation | `openai-codex/gpt-5.6-sol`   | medium   | 1+, non-overlapping pieces        |
| Review         | `anthropic/claude-fable-5-1` | medium   | always both, in tandem            |
|                | `openai-codex/gpt-6-astra`   | medium   |                                   |
| Discussion     | fable or astra (see below)   | medium   | 1 peer, or an independent pair    |

When launching several research or implementation sessions, split the work so
no two sessions touch the same files or answer the same question. If the work
cannot be split cleanly, use one session.

## Know which model you are

```bash
printf '%s/%s\n' "$PI_PROVIDER" "$PI_MODEL"
```

- **One-on-one discussion:** launch the model you are *not*. If you are
  `claude-fable-5-1`, launch `openai-codex/gpt-6-astra`. If you are
  `gpt-6-astra`, launch `anthropic/claude-fable-5-1`. On any other model,
  launch fable unless the user names a partner.
- **Independent pair** (review, or a two-agent discussion you facilitate but
  do not join): launch both fable and astra regardless of your own model. You
  are the facilitator, so overlap with one of them does not matter.
- Never launch a session on your own model to discuss with yourself.

## Launch

Confirm Herdr first: `test "${HERDR_ENV:-}" = 1`. Run `herdr --skill` if you
have not already this session. Load the `pi-intercom` skill before coordinating,
and instruct every delegated session to load it. The global prohibition on
`pi-subagents` overrides any `pi-subagents` guidance in that skill.

1. Create a dedicated workspace without changing the user's focus. Never split,
   move, resize, or otherwise modify the calling agent's workspace:

   ```bash
   herdr workspace create \
     --cwd "$PWD" \
     --label <descriptive-workspace-name> \
     --no-focus
   ```

   Read the workspace ID and first tab's root pane ID from `.result.workspace`
   and `.result.root_pane`. Parse the returned IDs; do not infer them.

2. Arrange the first tab as either `1x2` or `2x2`. Prefer `1x2`. Create an
   equal side-by-side split and read the right pane ID from
   `.result.pane.pane_id`:

   ```bash
   herdr pane split \
     --pane <root-pane-id> \
     --direction right \
     --ratio 0.5 \
     --cwd "$PWD" \
     --no-focus
   ```

   Use `2x2` only when four closely related sessions or processes benefit from
   remaining visible together. After the right split, split the root and right
   panes downward with `--ratio 0.5`, reading each new pane ID from the command
   response. Never create `2x1`, `1x4`, `4x4`, or larger pane layouts.

3. When more working space is needed, prefer additional tabs in the dedicated
   workspace over further pane splits:

   ```bash
   herdr tab create \
     --workspace <workspace-id> \
     --cwd "$PWD" \
     --label <descriptive-tab-name> \
     --no-focus
   ```

   Read the new tab's root pane ID from `.result.root_pane`.

4. Start pi in the selected pane with the model, thinking level, and a
   descriptive name. The name doubles as the `pi-intercom` target:

   ```bash
   herdr agent start <name> --kind pi --pane <pane-id> -- \
     --model <provider/model>:<thinking> --name <name>
   ```

   Name pattern: `<role>-<topic>`, e.g. `research-auth-flow`, `impl-retry-client`,
   `review-fable`, `review-astra`, `discuss-astra`.

5. Confirm the session is live with `intercom({ action: "list" })`, then send
   the brief with `send`. A good brief includes:
   - the goal and the definition of done
   - constraints and things not to touch
   - key files or commands
   - expected output shape
   - who to report to (your session name) and that it must not delegate further
   - an instruction to load the `pi-intercom` skill
   - an instruction to report blockers, material progress, and completion over
     `pi-intercom` without waiting to be polled
   - whether to answer an active `ask` with `reply` or report an asynchronously
     assigned task with `send`

## Research and implementation

- Brief each session independently; do not rely on them discovering each other.
- Use `ask` when the result is required synchronously and the work is expected
  to finish within the ask timeout. The delegated session must answer with
  `reply`.
- For longer work, use `send`. The delegated session must report progress,
  blockers, and completion to the controlling session with `send`.
- After using `send`, continue independent work or end the current turn and rely
  on the inbound `pi-intercom` report. Never use `sleep`, timer loops, or
  repeated `list`, `status`, Herdr, agent, or pane checks merely to determine
  whether the delegated session has finished. Use `list` for target discovery
  and `status` for troubleshooting, not as completion polling.
- Implementation sessions should report the files changed and how they verified
  the change. Review their diff yourself before presenting it to the user.

## Paired review

1. Launch `review-fable` and `review-astra` with the same brief.
2. Tell each reviewer the other's session name. Instruct them to finish their
   own pass first, then compare findings over `pi-intercom`, resolve
   disagreements where possible, and have one of them return a single
   consolidated review that lists agreed findings, unresolved disagreements,
   and severity.
3. Relay the consolidated review to the user with your own assessment of any
   unresolved points.

## Discussion

A discussion is a genuine exchange, not a status check. Use it to pressure-test
a design, plan, or decision.

**One-on-one (you are a participant):**

1. Announce to the user that you are opening a discussion and with which model.
2. Launch one peer on the other model, e.g. `discuss-astra`.
3. Send your position and the specific question you want challenged.
4. Iterate with `ask`: respond to objections, refine, concede or defend. Stop
   when you converge or the disagreement is clearly articulated; do not loop
   for its own sake.
5. Report to the user: what changed in your thinking, what you agreed on, and
   what remains contested with each side's reasoning.

**Independent pair (you facilitate):**

1. Launch `discuss-fable` and `discuss-astra` with the same brief and each
   other's names.
2. Ask them to exchange positions directly over `pi-intercom` and to return a
   joint summary of agreements and disagreements.
3. Synthesize for the user, adding your own view.

## Cleanup

- Once results are captured, close the dedicated workspace and sessions you
  created unless the user wants them kept for follow-up.
- Never close or rearrange panes, tabs, or workspaces you did not create.
- Summarize outcomes to the user; do not paste raw transcripts.
