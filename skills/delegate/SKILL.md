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
have not already this session.

1. Create a sibling pane (or a tab/workspace for long-lived work):

   ```bash
   herdr pane split --current --direction right --cwd "$PWD" --no-focus
   ```

   Read the pane ID from `.result.pane.pane_id`.

2. Start pi in it with the model, thinking level, and a descriptive name.
   The name doubles as the `pi-intercom` target:

   ```bash
   herdr agent start <name> --kind pi --pane <pane-id> -- \
     --model <provider/model>:<thinking> --name <name>
   ```

   Name pattern: `<role>-<topic>`, e.g. `research-auth-flow`, `impl-retry-client`,
   `review-fable`, `review-astra`, `discuss-astra`.

3. Confirm the session is live with `intercom({ action: "list" })`, then send
   the brief with `send`. A good brief includes:
   - the goal and the definition of done
   - constraints and things not to touch
   - key files or commands
   - expected output shape
   - who to report to (your session name) and that it must not delegate further

## Research and implementation

- Brief each session independently; do not rely on them discovering each other.
- Use `ask` when you need the result to continue; use `send` plus a later
  `ask` for long tasks that might exceed the ask timeout.
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

- Once results are captured, close the panes and sessions you created unless
  the user wants them kept for follow-up.
- Never close panes, tabs, or workspaces you did not create.
- Summarize outcomes to the user; do not paste raw transcripts.
