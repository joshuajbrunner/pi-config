# Model Selection

Role skills define preferred defaults, but an explicit model request always
overrides them. Apply the role's default only when the user does not choose a
model. If the user names several models, launch one session for each unless the
request says otherwise.

Use direct Anthropic and OpenAI Codex providers for the aliases below. Use
OpenRouter only when the user explicitly requests it or requests a model that is
available only there.

## Common aliases

| Alias | Provider and model |
|---|---|
| `fable` | `anthropic/claude-fable-5-1` |
| `opus` | `anthropic/claude-opus-5` |
| `sonnet` | `anthropic/claude-sonnet-5` |
| `haiku` | `anthropic/claude-haiku-4-5` |
| `astra` | `openai-codex/gpt-6-astra` |
| `sol` | `openai-codex/gpt-5.6-sol` |
| `terra` | `openai-codex/gpt-5.6-terra` |
| `luna` | `openai-codex/gpt-5.6-luna` |
| `spark` | `openai-codex/gpt-5.3-codex-spark` |

An unversioned family alias selects the entry above. Honor an explicit version
instead; for example, `opus 4.8` means `anthropic/claude-opus-4-8`, not the
unversioned `opus` alias.

## Directly available models

### Anthropic

- `anthropic/claude-fable-5`
- `anthropic/claude-fable-5-1`
- `anthropic/claude-haiku-4-5`
- `anthropic/claude-opus-4-5`
- `anthropic/claude-opus-4-6`
- `anthropic/claude-opus-4-7`
- `anthropic/claude-opus-4-8`
- `anthropic/claude-opus-5`
- `anthropic/claude-sonnet-4-5`
- `anthropic/claude-sonnet-4-6`
- `anthropic/claude-sonnet-5`

Timestamped variants may also be available. Use them only when explicitly
requested.

### OpenAI Codex

- `openai-codex/gpt-5.3-codex-spark`
- `openai-codex/gpt-5.4`
- `openai-codex/gpt-5.4-mini`
- `openai-codex/gpt-5.5`
- `openai-codex/gpt-5.6-luna`
- `openai-codex/gpt-5.6-sol`
- `openai-codex/gpt-5.6-terra`
- `openai-codex/gpt-6-astra`

## Other models

The live catalog is authoritative and may change. When the user requests a
model or provider not listed above, query it before launching:

```bash
pi --list-models
```

Match against the provider and model columns. Accept a full identifier in the
form `<provider>/<model>`, including OpenRouter identifiers such as
`openrouter/google/gemini-3.1-pro-preview`. If a short name has multiple
plausible matches, ask the user rather than guessing.

Use the thinking level explicitly requested by the user. Otherwise use the
invoked role skill's preferred thinking level. Pass the resolved selection to
Herdr as `<provider/model>:<thinking>`.
