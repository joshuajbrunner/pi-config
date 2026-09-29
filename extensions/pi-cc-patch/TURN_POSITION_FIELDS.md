# Claude Code prompt and turn index fields

## Status

The position-tracking implementation accompanying this document is experimental and should not be treated as verified for all pi prompt paths. Claude Code 2.1.284 binary inspection establishes the client format and counting rules, not Anthropic's server-side billing requirements. No live 2.1.284 billing verification was performed.

## Complete omission, not empty values

Claude Code's billing-header builder constructs the pair conditionally:

```js
const promptIndex = turnPosition?.promptIndex;
const turnIndex = turnPosition?.turnIndex;
const fields = validIndex(promptIndex, 0) && validIndex(turnIndex, 1)
  && route === "firstParty" && firstPartyEligible()
    ? ` cc_prompt_index=${promptIndex}; cc_turn_index=${turnIndex};`
    : "";
```

When the condition fails, neither field name nor its equals sign appears in the header. Claude Code does not send `cc_prompt_index=; cc_turn_index=;`.

Both fields must be integers at most 10,000,000. The prompt index may be zero; the turn index must be at least one. Claude Code's internal turn-position validator additionally requires `promptIndex <= turnIndex` (the header builder itself only checks the individual bounds).

## Meaning and counting

- `cc_prompt_index` counts turns classified as `human`.
- `cc_turn_index` counts eligible turns regardless of origin.
- The first human turn receives `1 / 1`.
- A new human turn increments both counters.
- A new non-human turn increments only the turn counter; a first non-human turn can therefore receive `0 / 1`.
- Tool-result model continuations reuse the enclosing turn's position. They do not increment counters per API request.
- Existing history without a reliable position can cause Claude Code to omit the pair rather than restart at one. Reaching the counter limit also prevents assigning a new position.

These are optional client fields: the official client can construct a header without them. This does not prove that Anthropic ignores them, nor that adding them determines a billing classification. Until accurate counting is implemented and tested, omission is preferable to invented positions.

## Current pi implementation limitations

The implementation in `index.ts` increments at `before_agent_start`, saves the position alongside request attribution, and restores it from the active branch. It covers ordinary, sequential first-party Anthropic prompts and their tool continuations, but has known gaps:

1. **Queued steering and follow-up prompts:** pi queues these without firing `before_agent_start`. They can reuse an earlier prompt ID and position despite containing new human input.
2. **Provider changes:** counting currently runs only for first-party Anthropic prompts, so intervening prompts on another provider are missed. Conversation counting must be separated from the decision to emit fields on an eligible request.
3. **Untracked later history:** restoration selects a saved custom entry without checking whether later messages represent untracked turns. A stale position can appear known even after the extension was disabled or another provider was used.
4. **Origin classification:** all tracked starts currently use `human`. Extension-generated inputs and automated work are not classified as separate non-human origins.

Legacy entries without indexes restore an unknown position and omit the pair. That conservative behavior should be retained.

## Verification needed before enabling tracking

- Sequential human prompts advance both counters exactly once.
- Tool continuations and automatic request retries do not advance either counter.
- Queued human steering and follow-up inputs are counted when delivered, not merely when queued.
- Non-human turns advance only the turn counter, or result in omission when their origin cannot be established.
- Provider changes do not silently drop conversation turns.
- Resume, reload, branch navigation, fork, clone, and compaction preserve a reliable position or omit unknown positions.
- Later untracked history cannot revive stale counters or prompt attribution.
- Invalid values and counter exhaustion omit the entire pair.

Existing historical live checks in `BILLING_HEADER_STATE_STRATEGY.md` concern request IDs and prompt IDs; they do not verify these newly introduced index fields.

## Inspection source

Inspected executable: `/opt/homebrew/Caskroom/claude-code@latest/2.1.284/claude`.

The embedded JavaScript contains the conditional billing-header pair and the turn-position validation and allocation helpers. Re-audit via [SKILL.md](SKILL.md) after upgrading Claude Code; minified helper names are not stable across versions.
