# policy-self-heal

Detect provider policy-classifier error responses and queue a safety-preserving recovery prompt.

This extension is aimed at false positives like OpenAI/Codex `cyber_policy` errors or Anthropic cyber/AUP blocks where ordinary development, education, or authorized defensive security work gets interrupted.

## What it does

- Watches streamed assistant error events and final assistant messages with `stopReason: "error"`.
- Detects known provider-policy patterns with separate provider-specific detectors:
  - `detectOpenAIPolicyError`: OpenAI/Codex `cyber_policy`, "possible cybersecurity risk", "Trusted Access for Cyber", cyber-abuse reroute warnings.
  - `detectAnthropicPolicyError`: Anthropic/Claude Code "violative cyber content", "Cyber Verification Program", `claude.com/form/cyber-use-case`, `anthropic.com/legal/aup`, "Claude Code is unable to respond", and related usage-policy messages.
  - `detectGenericPolicyError`: generic content/usage/safety-policy blocks.
- Queues one follow-up recovery prompt per agent turn.
- Persists a small custom session entry with the detected error and recovery prompt for debugging.
- Provides `/policy-self-heal` to toggle behavior and inspect the last event.

## Safety stance

The recovery prompt deliberately does **not** try to bypass provider policy or hide trigger words. It tells the next model call to:

- Re-read the actual user request under normal safety rules.
- Continue only for ordinary software engineering, education, or clearly authorized defensive/security research.
- Ask for missing authorization/scope instead of proceeding.
- Refuse credential theft, malware, persistence, evasion, exfiltration, unauthorized access, or real-world exploitation.
- Prefer defensive alternatives like code review, hardening, detection, triage, documentation, and toy/sandbox examples.

This is a guardrail-preserving self-heal for false positives, not a policy bypass.

## Commands

```text
/policy-self-heal status     Show current enabled/auto status
/policy-self-heal on         Enable detection
/policy-self-heal off        Disable detection
/policy-self-heal auto-on    Automatically queue the safe recovery prompt
/policy-self-heal auto-off   Detect and notify only
/policy-self-heal last       Open the last detected event in an editor
```

## Flags

```bash
pi --policy-self-heal=false
pi --policy-self-heal-auto=false
```

## Notes from research

OpenAI documents that newer/high-cyber-capability models can return `cyber_policy` API errors when automated checks flag suspicious cyber activity. They recommend Trusted Access for Cyber, support escalation, `/feedback` for Codex false positives, and `safety_identifier` for API platforms to isolate user-specific reviews.

Anthropic users have reported similar Claude Code false positives around cyber/AUP checks. Public examples usually do not expose a stable structured code like OpenAI's `cyber_policy`; they are mostly text in the API/Claude Code error message, including "Claude Code is unable to respond to this request", "appears to violate our Usage Policy", "violative cyber content", and Cyber Verification Program / cyber-use-case form links. The official path is a cyber use-case/exemption request; some reports note that prior conversation context can keep triggering blocks, so starting fresh or clarifying authorized scope can help.

## Testing

```bash
cd ~/Projects/pi-config/extensions/policy-self-heal
npx tsx --test index.test.ts
```
