# pi-cc-patch

Use your Pro/Max subscription billing with [pi](https://github.com/earendil-works/pi-mono) instead of getting the "Third-party apps now draw from your extra usage" error.

## What it does

The API classifier detects pi as a third-party app and blocks subscription billing. This extension patches the request payload to bypass it:

1. **Sanitizes trigger phrases** from the system prompt that trip the classifier
2. **Adds billing header** with properly computed version suffix (matching Claude Code's algorithm)
3. **Strips prefix block** that triggers detection

No token swap, no SDK dependency, no proxy. Just a `before_provider_request` hook. Pi's built-in provider handles everything else — caching, token refresh, thinking, streaming, tool mapping.

## Billing Header

The billing header uses Claude Code's exact algorithm for the version suffix:

```
x-anthropic-billing-header: cc_version=2.1.280.{suffix}; cc_entrypoint=cli; cch=00000; [cc_prev_req=…;] [cc_prompt_id=…;] cc_turn_origin=human;
```

Where `{suffix}` is computed as:
```
suffix = sha256(SALT + chars[4,7,20] + VERSION).slice(0, 3)
```

- **SALT**: `59cf53e54c78` (extracted from Claude Code binary)
- **chars[4,7,20]**: Characters at positions 4, 7, 20 of the first user message (or "0" if missing)
- **VERSION**: Audited Claude Code version (`2.1.280`)
- **ENTRYPOINT**: Normal Claude Code CLI sessions use `cli`

Claude Code 2.1.280 also supports optional billing-header fields that this extension does not emit for the normal main CLI path:

- `cc_workload={value};` when a workload tag is set
- `cc_is_subagent=true;` for non-main subagent sessions
- `cch=00000;` is omitted for some non-first-party providers such as Bedrock/AWS/Mantle

## Observed Claude Code 2.1.280 fields

Static inspection of Claude Code 2.1.280 confirmed the existing request-attribution fields and found one additional conditional field in its billing-header builder:

- `cc_prev_req=req_...;` identifies the preceding Anthropic API request. Claude Code obtains this server-assigned value from earlier assistant request history.
- `cc_prompt_id={uuid};` identifies the current human prompt. Claude Code generates it locally with `randomUUID()` and reuses it for model requests associated with that prompt.
- `cc_turn_origin=human;` identifies a normal interactive human turn. The builder validates origin values with `^[a-z][a-z_]{0,31}$`; Claude Code carries the value across model requests for the same turn.

The extension emits these fields for first-party Anthropic requests. A new human prompt receives a new `cc_prompt_id`; tool continuations reuse it. `cc_prev_req` advances from the preceding successful Anthropic response's `request-id` and is absent on the first request when no predecessor exists. Normal pi prompts use `cc_turn_origin=human`. Requests routed through proxies or other providers do not receive these request-attribution fields.

See [Billing Header Request-State Strategy](BILLING_HEADER_STATE_STRATEGY.md) for the observed validation rules, pi session-tree behavior, lifecycle validation, and references for future CCH investigation. The extension intentionally continues to send the existing literal `cch=00000` value.

## Response Header Diagnostics

For first-party Anthropic models using `api.anthropic.com`, the extension records the response status and normalized response headers exposed by pi's `after_provider_response` event. The latest 50 entries are written beside the session data:

```text
{session-data-directory}/provider-response-headers.jsonl
```

For a session file named `example.jsonl`, the log is stored in the sibling `example/provider-response-headers.jsonl` path. A first-party Anthropic/OAuth request on 2026-09-04 confirmed that pi exposes a lowercase `request-id` header containing a `req_...` value. The extension validates and retains that value as session-tree state and emits it as `cc_prev_req` on the next eligible request.

## Important: Disable Extra Usage

Before using this extension, **disable extra usage** in your Claude account settings:

1. Go to [claude.ai/settings/usage](https://claude.ai/settings/usage)
2. Toggle **extra usage off**

If extra usage is enabled and the patch fails or Anthropic changes their detection, you could silently fall back to pay-as-you-go API rates instead of being blocked. With a Max plan at $100–$200/month, unexpected API billing can add up fast — especially with agentic workloads that consume tokens heavily. Disabling extra usage ensures you get a hard stop instead of a surprise bill.

## Install

```bash
pi install git:github.com/joshuajbrunner/pi-config
```

Then restart pi. Use `/login` if you haven't already.

## Uninstall

```bash
pi remove git:github.com/joshuajbrunner/pi-config
```

## Testing

Run the test suite:

```bash
cd ~/.pi/agent/git/github.com/joshuajbrunner/pi-config/extensions/pi-cc-patch
npx tsx --test index.test.ts
```

Tests include verification against actual Claude Code debug logs.
