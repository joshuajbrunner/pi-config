# Claude Code API Endpoint Research

Research date: 2026-06-11

Claude Code version inspected: `2.1.169`

Binary inspected: `~/.local/share/claude/versions/2.1.169`

Method: static string inspection of the Claude Code binary with `strings` and URL filtering. This identifies embedded endpoint strings, not necessarily every endpoint hit at runtime in a particular session.

## Summary

For the `pi-cc-patch` extension's normal first-party Anthropic/OAuth path, the most relevant endpoint is:

```txt
https://api.anthropic.com/v1/messages
```

Claude Code also embeds endpoints for file/session APIs, OAuth, Claude web onboarding/account flows, downloads, docs, alternate providers, and integrations.

## Core Anthropic API

```txt
https://api.anthropic.com/v1/messages
https://api.anthropic.com/v1/models/claude-opus-4-8
https://api.anthropic.com/v1/files
https://api.anthropic.com/v1/files/$FILE_ID/content
https://api.anthropic.com/v1/files?scope_id=$SESSION_ID
https://api.anthropic.com/v1/sessions
https://api.anthropic.com/v1/sessions/$SESSION_ID
https://api.anthropic.com/v1/sessions/$SESSION_ID/events
https://api.anthropic.com/v1/sessions/$SESSION_ID/events?page=page_abc123
https://api.anthropic.com/v1/sessions/$SESSION_ID/events/stream
https://api.anthropic.com/v1/agents
https://api.anthropic.com/v1/environments
```

## OAuth / Claude Code Auth

```txt
https://claude.com/cai/oauth/authorize
https://claude.ai/oauth/claude-code-client-metadata
https://api.anthropic.com/api/oauth/claude_cli/create_api_key
https://api.anthropic.com/api/oauth/claude_cli/roles
https://platform.claude.com/buy_credits?returnUrl=/oauth/code/success%3Fapp%3Dclaude-code
```

## Claude Web / Account / Onboarding

```txt
https://claude.ai
https://claude.ai/code
https://claude.ai/code/onboarding?magic=env-setup
https://claude.ai/code/onboarding?magic=github-app-setup
https://claude.ai/code/routines
https://claude.ai/code/routines/{ROUTINE_ID}
https://claude.ai/settings/usage
https://claude.ai/settings/data-privacy-controls
https://claude.ai/upgrade/max
https://claude.ai/create/team
https://claude.ai/customize/connectors
https://claude.ai/download
https://claude.ai/chrome
```

## Downloads / Updates / Docs

```txt
https://downloads.claude.ai/claude-code-releases
https://downloads.claude.ai/claude-code-releases/plugins/claude-plugins-official
https://code.claude.com/docs
https://code.claude.com/docs/en
https://code.claude.com/docs/en/overview
https://code.claude.com/docs/en/changelog.md
https://code.claude.com/docs/en/network-config.md
https://code.claude.com/docs/en/env-vars.md
https://code.claude.com/docs/en/settings.md
https://code.claude.com/docs/en/amazon-bedrock.md
https://code.claude.com/docs/en/google-vertex-ai.md
https://code.claude.com/docs/en/microsoft-foundry.md
```

## Provider-Specific Alternatives

Claude Code embeds endpoints for non-first-party providers. These are not the normal Anthropic/OAuth `pi-cc-patch` path, but they explain provider-specific header differences such as omitting `cch=00000;` for some providers.

### Amazon Bedrock / AWS

```txt
https://bedrock-runtime.${region}.amazonaws.com
https://bedrock.${region}.amazonaws.com
https://aws-external-anthropic.${region}.api.aws
https://bedrock-mantle.${region}.api.aws/anthropic
```

Also observed generic/static examples:

```txt
https://aws-external-anthropic.{region}.api.aws
https://aws-external-anthropic.{region}.api.aws/v1/...
https://bedrock-mantle.{region}.api.aws/anthropic
```

### Google Vertex AI

```txt
https://aiplatform.googleapis.com
https://aiplatform.googleapis.com/v1
https://${region}-aiplatform.googleapis.com/v1
https://aiplatform.us.rep.googleapis.com/v1
https://aiplatform.eu.rep.googleapis.com/v1
https://aiplatform.${region}.rep.googleapis.com
```

### Azure / Microsoft Foundry

```txt
https://${resource}.services.ai.azure.com
https://${resource}.services.ai.azure.com/anthropic/
https://<resource>.services.ai.azure.com/anthropic
```

## Integrations / MCP / GitHub

```txt
https://api.github.com
https://api.github.com/graphql
https://api.githubcopilot.com/mcp/
https://mcp-proxy.anthropic.com
https://mcp.sentry.dev/mcp
https://api.notion.com/v1/oauth/token
```

## Related Anthropic / Claude Hosts

```txt
https://api.anthropic.com
https://api-staging.anthropic.com
https://claude.ai
https://claude.com
https://claude-ai.staging.ant.dev
https://beacon.claude-ai.staging.ant.dev
https://claude.fedstart.com
https://claude-staging.fedstart.com
```

## Commands Used

```bash
claude --version
ls -l ~/.local/bin/claude
find ~/.local/share/claude/versions -maxdepth 1 -type f -o -type l | sort

strings ~/.local/share/claude/versions/2.1.169 \
  | rg -o 'https?://[^"` )]+' \
  | sort -u

strings ~/.local/share/claude/versions/2.1.169 \
  | rg -o 'https?://[^"` )]+' \
  | sort -u \
  | rg 'anthropic|claude|sentry|statsig|segment|launchdarkly|googleapis|amazonaws|services.ai.azure|api.github|api\\.github|github.com|stripe|oauth|console'
```

## Notes for Future Audits

- Static strings include docs, examples, test text, and provider libraries, so presence in the binary does not guarantee runtime use in every session.
- For first-party Claude Code chat/model traffic, prioritize tracing `api.anthropic.com/v1/messages`.
- For OAuth login and subscription/account flows, prioritize `claude.com/cai/oauth/authorize`, `claude.ai/oauth/claude-code-client-metadata`, and `api.anthropic.com/api/oauth/claude_cli/*`.
- Provider-specific paths may affect the billing header. In Claude Code 2.1.169, the header still includes `cch=00000;` except for providers such as Bedrock/AWS/Mantle.
