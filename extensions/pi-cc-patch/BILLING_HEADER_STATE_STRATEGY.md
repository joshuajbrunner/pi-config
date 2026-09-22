# Billing Header Request-State Strategy

## Status

This document records behavior observed in the Claude Code 2.1.280 executable and the request-state implementation in `pi-cc-patch`. The extension generates, validates, persists, restores, and conditionally emits the values described here for first-party Anthropic requests.

The extension also logs Anthropic response headers so the actual header names and values exposed by pi can be verified.

## Claude Code 2.1.280 behavior

Claude Code still emits the existing billing-header fields:

```text
x-anthropic-billing-header: cc_version={version}.{suffix}; cc_entrypoint={entrypoint}; cch=00000;
```

Its billing-header builder can also emit these conditional fields:

```text
cc_prev_req=req_...;
cc_prompt_id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx;
cc_turn_origin=human;
```

For normal first-party Anthropic requests, the fields are constructed as follows.

### `cc_prompt_id`

Claude Code generates the prompt ID locally with `randomUUID()` from the standard `crypto` module. It creates a new UUID for a human prompt and reuses that UUID for subsequent model requests caused by the same prompt, including tool-result continuations and retries.

The billing-header builder emits the field only when the value is a UUID:

```text
^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
```

When choosing a prompt ID from conversation history, Claude Code skips tool-result user messages and selects the latest eligible human user message. A subagent request can fall back to its parent prompt ID.

### `cc_prev_req`

Claude Code does not derive this value from `cc_prompt_id`. It reads the request ID assigned by Anthropic to the preceding API response, retains it with the assistant history, and supplies it to the next billing-header construction.

The builder emits the field only when the value matches:

```text
^req_[A-Za-z0-9_-]{1,36}$
```

A first request has no previous request ID, so this field is absent.

### `cc_turn_origin`

Claude Code 2.1.280 attaches a turn origin to the latest eligible user message and carries it across model requests for the same turn. A normal interactive prompt uses:

```text
cc_turn_origin=human;
```

Other observed origin categories include `auto_continuation`, `task_notification`, `scheduled`, `peer`, `host_synthetic`, `system`, `sdk`, and `unknown`. The billing-header builder emits the field only when it matches:

```text
^[a-z][a-z_]{0,31}$
```

### Other conditions

All three request-attribution fields are restricted to the first-party Anthropic path using the normal Anthropic endpoint. The builder can omit them when their values are unavailable or invalid. This conditional construction does not establish whether Anthropic's billing classifier currently requires them.

## Other billing fields

### `cch`

The JavaScript builder inserts the fixed sentinel:

```text
cch=00000;
```

Claude Code 2.1.280 includes it when the provider route is first-party with an unset or `api.anthropic.com` base URL, or when the provider route is Vertex. It omits the field for routes such as Bedrock, Foundry, Mantle, and the Claude Code gateway.

The placeholder should not be assumed to be the final value on the network. Independent runtime analysis reports that Claude Code's custom Bun `fetch` implementation recognizes `/v1/messages` requests, hashes the serialized request body, and replaces the five zeroes with a request-dependent five-character hexadecimal value before transmission. The installed JavaScript confirms the sentinel construction and routing conditions, but this native replacement was not independently reproduced during this audit.

`pi-cc-patch` will continue sending the literal sentinel because pi runs on Node rather than Claude Code's custom Bun runtime. CCH signing depends on the exact final serialized request bytes and cannot be implemented safely in the extension's current pre-serialization payload hook. It would require a fetch-level wrapper or a custom provider, version-specific constants, and independent wire validation. No CCH behavior is changed by the request-state work in this document.

#### Related CCH research and implementations

These sources are unofficial. Most were published around the March 2026 Claude Code source leak and may describe versions older than 2.1.280.

- [What's cch? Reverse Engineering Claude Code's Request Signing](https://a10k.co/b/reverse-engineering-claude-code-cch.html) — runtime and wire-level reverse engineering of the sentinel replacement and body hash.
- [Claude Code's Defense in Depth](https://yage.ai/share/claude-code-defense-in-depth-en-20260401.html) — source-level discussion of native client attestation.
- [The Claude Code Source Leak](https://alex000kim.com/posts/2026-03-31-claude-code-source-leak/) and [Claude Code's Source Code Leaked](https://akitaonrails.com/en/2026/03/31/claude-code-source-code-leaked-what-we-found-inside/) — independent summaries of the leaked implementation.
- [pi-sub-anthropic internals](https://github.com/spksoft/pi-sub-anthropic/blob/main/docs/internals.md) — a Node-compatible Pi provider that inserts `cch=00000`, serializes the complete body, computes XXH64 with constants pinned from OMP 17.4.2, and overwrites the five placeholder bytes immediately before `fetch`. It targets a Cowork/Claude Desktop fingerprint rather than the standalone CLI fingerprint used here, so its seed and other constants must not be copied directly.
- [Claude Code issue #24168](https://github.com/anthropics/claude-code/issues/24168), [CLIProxyAPI issue #1592](https://github.com/router-for-me/CLIProxyAPI/issues/1592), and [Claude Code issue #40652](https://github.com/anthropics/claude-code/issues/40652) — field reports covering provider rejection, changing CCH values, cache effects, and accidental sentinel replacement in historical content.
- [Claude Code Billing Header gist](https://gist.github.com/NTT123/579183bdd7e028880d06c8befae73b99) — an older conflicting interpretation that derives CCH from the user message with SHA-256. Later body-level XXH64 analyses contradict it, so it should not be used as an implementation reference.

There is no known official Anthropic specification for CCH. Any future implementation should revalidate the installed binary and actual transmitted bytes rather than treating these sources as a stable protocol.

### `cc_workload`

This is an optional free-form workload tag read from `AsyncLocalStorage`, so it follows the active turn rather than becoming global conversation state. The binary exposes a hidden print-mode option:

```text
--workload <tag>
```

Its embedded help describes the field as process-scoped billing-header attribution for SDK daemon callers that spawn subprocesses for cron work. The confirmed built-in tag is:

```text
cc_workload=cron;
```

The same tag is also included in Claude Code's user-agent attribution. Normal interactive human turns have no workload tag. Pi should omit this field unless it implements an equivalent, evidenced workload category.

### `cc_is_subagent`

The builder emits the fixed marker:

```text
cc_is_subagent=true;
```

It does so when the active agent context has `agentType === "subagent"` and `isMainSession` is not true. It does not emit `false`, and the inspected condition does not classify teammate contexts as subagents.

This describes the request's execution context, not whether the conversation happens to contain tool calls. A normal main-session tool loop does not set it. Pi should emit it only when it can reliably identify an equivalent child-agent request.

When every optional field is present, the binary constructs them in this order:

```text
x-anthropic-billing-header: cc_version={version}.{suffix}; cc_entrypoint={entrypoint}; cch=00000; cc_workload={tag}; cc_is_subagent=true; cc_prev_req={requestId}; cc_prompt_id={promptId}; cc_turn_origin={origin};
```

## Pi data currently available

Pi stores an Anthropic assistant message's `responseId` in the session JSONL. That value is an Anthropic message ID such as `msg_...`; it is not the HTTP request ID required by `cc_prev_req`.

Pi exposes response status and normalized HTTP response headers through `after_provider_response`. For the built-in Anthropic provider, this event is populated from the Anthropic SDK response before the response stream is consumed.

A first-party Anthropic/OAuth request made through pi on 2026-09-04 confirmed that the event includes a lowercase `request-id` header whose value matches Claude Code's `req_...` validation rule. The response completed successfully while this extension still emitted its unchanged billing header.

## Diagnostic header log

Anthropic response headers are written to:

```text
{session-data-directory}/provider-response-headers.jsonl
```

For a session file named `example.jsonl`, the session data directory is the sibling `example/` directory. Each line contains:

```json
{"timestamp":"...","status":200,"headers":{"request-id":"req_..."}}
```

The log retains the latest 50 responses. Logging does not alter outgoing requests. Request-state persistence is handled separately through custom session entries.

## Request-state implementation

### Prompt lifecycle

1. Generate a UUID when `before_agent_start` fires for a new Anthropic human prompt.
2. Reuse it for all provider requests in that agent run.
3. Persist it and emit it as `cc_prompt_id` on eligible first-party requests.
4. Emit `cc_turn_origin=human` for the normal interactive pi turn and its continuations.
5. Generate a new UUID for the next human prompt.

Queued steering and follow-up prompts need explicit verification because they may begin a new agent run while sharing surrounding conversation history.

### Request lifecycle

1. Retain the most recent valid Anthropic request ID, if one exists.
2. Read the confirmed `request-id` header from `after_provider_response`; do not treat proxy-style `x-request-id` values as Claude Code request state.
3. Validate it against Claude Code's `req_...` pattern.
4. Clear the stored request ID when the response does not contain a valid value so an older, non-immediate request cannot be emitted later.
5. Persist the captured value and emit it as `cc_prev_req` on the next eligible request.

Tracking is restricted to models whose provider is exactly `anthropic` and whose base URL host is exactly `api.anthropic.com`. Claude-named models routed through Bedrock, Vertex, or a proxy are not treated as first-party request state.

### Session-tree storage

Observed state is stored with `pi.appendEntry()` using this custom entry:

```json
{
  "type": "custom",
  "customType": "cc-patch-request-state",
  "data": {
    "promptId": "550e8400-e29b-41d4-a716-446655440000",
    "requestId": "req_abc123"
  }
}
```

Custom entries remain outside model context but participate in pi's session tree. Restore the latest state from `ctx.sessionManager.getBranch()`:

- during `session_start` for startup, reload, resume, fork, and clone;
- during `session_tree` after in-file tree navigation.

This makes the selected branch, rather than process-global recency, determine the next `cc_prev_req` and active `cc_prompt_id`.

## Lifecycle verification

Live first-party Anthropic/OAuth requests through pi confirmed:

- the response event contains lowercase `request-id` with a `req_...` value and status `200` before its stream is consumed;
- a controlled two-tool loop produced three API responses and three distinct request IDs;
- all tool-loop requests retained one prompt ID while each response advanced the stored request ID;
- the next human prompt received a new prompt ID and retained the preceding request ID;
- navigating with `/tree` restored the request ID from the selected branch rather than the abandoned branch;
- `/fork` copied the selected branch's custom state into the new session, and submitting the forked prompt generated a new prompt ID while retaining that branch's preceding request ID;
- `/clone` copied the full active branch and generated a new prompt ID while retaining the clone source's preceding request ID;
- `/reload` restored the active request ID before the next prompt;
- reopening a session restored its custom state;
- an injected `529 overloaded_error` triggered pi's automatic retry without generating a second prompt ID or replacing the preceding successful request ID; the successful retry then captured its own response request ID;
- request-attribution fields remained absent from every logged outgoing system prompt during these checks, confirming that the lifecycle could be validated before enabling emission.

The implementation now emits valid request state in Claude Code's observed order:

```text
cch=00000; cc_prev_req={requestId}; cc_prompt_id={promptId}; cc_turn_origin=human;
```

The first request omits `cc_prev_req`. All three request-attribution fields are omitted unless the model provider is exactly `anthropic` and its base URL host is exactly `api.anthropic.com`.

A post-emission live test on 2026-09-04 confirmed:

- all three requests completed with status `200` and distinct Anthropic `request-id` values;
- the initial request emitted `cc_prompt_id` without `cc_prev_req`;
- the tool continuation reused that prompt ID and emitted the first response's request ID as `cc_prev_req`;
- reopening the saved session and submitting another human prompt generated a different prompt ID while emitting the tool continuation's response ID as `cc_prev_req`;
- every request used the then-current `cc_version=2.1.260.{suffix}` and retained the literal `cch=00000` sentinel.

Proxy exclusion remains covered by automated tests rather than a live custom-provider request.
