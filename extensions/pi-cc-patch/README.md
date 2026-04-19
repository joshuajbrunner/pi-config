# pi-cc-patch

Use your Pro/Max subscription billing with [pi](https://github.com/mariozechner/pi-coding-agent) instead of getting the "Third-party apps now draw from your extra usage" error.

## What it does

The API classifier detects pi as a third-party app and blocks subscription billing. This extension patches the request payload to bypass it:

1. **Sanitizes trigger phrases** from the system prompt that trip the classifier
2. **Adds billing header** with properly computed version suffix (matching Claude Code's algorithm)
3. **Strips prefix block** that triggers detection

No token swap, no SDK dependency, no proxy. Just a `before_provider_request` hook. Pi's built-in provider handles everything else — caching, token refresh, thinking, streaming, tool mapping.

## Billing Header

The billing header uses Claude Code's exact algorithm for the version suffix:

```
x-anthropic-billing-header: cc_version=2.1.114.{suffix}; cc_entrypoint=cli; cch=00000;
```

Where `{suffix}` is computed as:
```
suffix = sha256(SALT + chars[4,7,20] + VERSION).slice(0, 3)
```

- **SALT**: `59cf53e54c78` (extracted from Claude Code binary)
- **chars[4,7,20]**: Characters at positions 4, 7, 20 of the first user message (or "0" if missing)
- **VERSION**: Current Claude Code version (e.g., `2.1.114`)

This makes the billing header indistinguishable from real Claude Code requests.

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
