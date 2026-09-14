---
name: council
description: Explicitly launch an autonomous council of two or more pi sessions in a dedicated Herdr workspace to discuss a topic with each other over pi-intercom.
disable-model-invocation: true
---

# Council

Launch a self-contained group of pi sessions that debate the user's topic with
each other. The spawning session creates and briefs the council, then gets out
of the conversation. Leave the completed council workspace open and focused so
the user can observe or join it directly.

The user's arguments are authoritative about the topic, models, participant
count, viewpoints, and desired output. Council is discussion-only by default;
do not ask participants to edit project files unless the user explicitly says
to do so.

## Preconditions

1. Confirm Herdr is available:

   ```bash
   test "${HERDR_ENV:-}" = 1
   ```

   If unavailable, explain the limitation and stop. Do not use another launcher.
2. Run `herdr --skill` before the first Herdr command in the session.
3. Read [the model selection reference](../references/models.md). Resolve every
   explicit model request before applying the defaults below.
4. Do not use `pi-subagents`, and prohibit every council member from delegating.
5. Announce the council's participants and models before creating it.

## Participants and models

Always launch at least two sessions.

Default council:

- Astra: `openai-codex/gpt-6-astra`, thinking `medium`
- Fable: `anthropic/claude-fable-5-1`, thinking `medium`

Honor explicit model and thinking-level requests. Common alternatives include
Opus (`anthropic/claude-opus-5`) and Sol (`openai-codex/gpt-5.6-sol`), but accept
any model resolved through the model selection reference.

When the user requests a participant count without naming enough models, add
models in this order, skipping ones already selected: Astra, Fable, Opus, Sol.
For a larger council, query `pi --list-models` and choose distinct suitable
models when possible. If the request names only one model, use it for one
member and add a default member from the other provider: Fable for an OpenAI
model, otherwise Astra.

Give every session a unique, meaningful name beginning with `council-`, such as
`council-astra`, `council-fable`, `council-opus`, or `council-security`. Names
must satisfy Herdr's `[a-z][a-z0-9_-]{0,31}` rule. Add a short numeric suffix
when a live name is already taken.

## Dedicated layout

Never add a pane to the calling tab or alter the calling workspace. Create a
dedicated workspace from the current directory without focusing it yet:

```bash
herdr workspace create \
  --cwd "$PWD" \
  --label council-<short-topic> \
  --no-focus
```

Read the workspace ID and root pane ID from `.result.workspace` and
`.result.root_pane`; never infer IDs.

Put two closely related members side by side in each fresh tab. Split the first
tab's root pane for the default pair:

```bash
herdr pane split \
  --pane <root-pane-id> \
  --direction right \
  --ratio 0.5 \
  --cwd "$PWD" \
  --no-focus
```

For each additional pair, create a new tab in the council workspace with
`--no-focus`, then split that tab's root pane in the same way. A final unpaired
member uses a new single-pane tab. Parse every returned tab and pane ID.

Start each member in its assigned pane:

```bash
herdr agent start <session-name> --kind pi --pane <pane-id> -- \
  --model <provider/model>:<thinking> --name <session-name>
```

## Autonomous discussion brief

Prompt every member through `herdr agent prompt`; do not send the assignment
from the spawning session through `pi-intercom`. Each prompt must contain all
of the following:

- the exact topic, question, context, and requested output
- the complete council roster, including names and models
- which member is the chair
- any viewpoint or role assigned to that member
- a read-only constraint unless edits were explicitly requested
- a prohibition on further delegation
- instructions to use `pi-intercom` to communicate directly with the named
  council peers and not with the spawning session
- instructions to use `send` for ordinary exchanges, `ask` only for a decision
  needed before continuing, and `reply` when answering an ask
- instructions to inspect the live roster with `intercom({ action: "list" })`
  and retry by explicit session name if another member is still starting
- instructions to surface assumptions, challenge weak claims, update positions
  when persuaded, and preserve substantive disagreement rather than forcing
  consensus

Choose the first listed member as chair unless the user specifies one. Also
give the roles below.

### Chair

Tell the chair to:

1. Start the exchange by sending the question and discussion structure to every
   other member over `pi-intercom`.
2. Ensure each member contributes an initial position and gets a chance to
   challenge another position.
3. Drive follow-up rounds until the council converges or further exchange would
   repeat established arguments.
4. Post the final synthesis to every peer over `pi-intercom` and print it clearly
   in the chair session. Include agreements, changed views, unresolved disputes
   with reasoning on each side, and a recommended conclusion when appropriate.

### Other members

Tell each other member to:

1. Develop an independent initial position before reading peers' conclusions.
2. Send that position to the chair over `pi-intercom`.
3. Respond substantively to the chair and peers, including direct challenges
   or questions when useful.
4. Acknowledge the chair's final synthesis and send corrections if it
   misrepresents the member's position.

Do not require progress reports, completion reports, or approval from the
spawning session. Council members continue through inbound `pi-intercom`
messages after their initial prompted turns.

## Hand off to the council

After all initial prompts have been submitted, focus the chair. This must be the
last Herdr control action from the spawning session:

```bash
herdr agent focus <chair-name>
```

Do not wait for completion, poll council state, synthesize its answer in the
spawning session, close its tabs, or close its workspace. The user now owns the
focused council workspace and may observe or interact with any member.
