# Claude Code Billing Header Audit

Use this skill when maintaining `extensions/pi-cc-patch` or when asked whether Claude Code changed its billing/attribution header algorithm.

## Goal

Verify the installed Claude Code CLI's billing header construction against the extension's constants and tests, especially after a Claude Code update.

## Procedure

1. Locate the Claude Code executable and version.

   ```bash
   command -v claude
   claude --version
   export CLAUDE_BINARY="$(python3 -c 'from pathlib import Path; import shutil; print(Path(shutil.which("claude")).resolve())')"
   printf '%s\n' "$CLAUDE_BINARY"
   if [ -d "$HOME/.local/share/claude/versions" ]; then
     find "$HOME/.local/share/claude/versions" -maxdepth 1 \( -type f -o -type l \) | sort
   fi
   ```

   The resolved path supports native installations and Homebrew Cask installations on Linux and macOS. Homebrew paths include `<brew-prefix>/Caskroom/claude-code@latest/<version>/claude`.

2. Search the current binary for billing-header markers. Repeat for a previous binary if one is available.

   ```bash
   rg -a -n "cc_version|cc_entrypoint|x-anthropic-billing-header|59cf53e54c78|cc_workload|cc_is_subagent|cc_prev_req|cc_prompt_id|cc_turn_origin|cc_gateway|cc_project|cc_prev_msg|cc_prev_prompt_index|cc_prev_turn_index" \
     "$CLAUDE_BINARY"
   ```

   If output is too large, use byte offsets:

   ```bash
   grep -aob 'x-anthropic-billing-header\|cc_version\|cc_entrypoint\|59cf53e54c78\|cc_workload\|cc_is_subagent\|cc_prev_req\|cc_prompt_id\|cc_turn_origin\|cc_gateway\|cc_project\|cc_prev_msg\|cc_prev_prompt_index\|cc_prev_turn_index' \
     "$CLAUDE_BINARY"
   ```

3. Extract nearby deminified JavaScript around the relevant offsets.

   ```bash
   python3 - <<'PY'
   import os
   from pathlib import Path
   path = Path(os.environ['CLAUDE_BINARY'])
   text = path.read_bytes().decode('utf-8', 'ignore')
   for term in ['x-anthropic-billing-header: cc_version', '59cf53e54c78', 'cc_prev_req', 'cc_prev_msg']:
       start = 0
       while (i := text.find(term, start)) >= 0:
           print('\n---', term, i, '---')
           print(text[max(0, i-1500):i+3000])
           start = i + len(term)
   PY
   ```

4. Confirm these pieces:

   - Salt: usually `59cf53e54c78`.
   - Sampled chars: commonly `[4, 7, 20].map(i => firstUserMessage[i] || "0").join("")`.
   - Suffix: commonly `sha256(SALT + sampledChars + VERSION).slice(0, 3)`.
   - Version: embedded Claude Code `VERSION` for the installed CLI.
   - Header: `x-anthropic-billing-header: cc_version=${VERSION}.${suffix}; cc_entrypoint=${entrypoint}; ...`.
   - Entrypoint: normal CLI sessions set `CLAUDE_CODE_ENTRYPOINT="cli"`; SDK/remote/desktop paths may differ.
   - `cch=00000;`: currently present for first-party Anthropic/OAuth, omitted for some providers such as Bedrock/AWS/Mantle.
   - Optional `cc_workload=...;` may appear when a workload is set.
   - Optional `cc_is_subagent=true;` may appear for non-main subagent sessions.
   - First-party requests may include validated request-attribution fields in this order: `cc_prev_req`, `cc_prompt_id`, then `cc_turn_origin`.
   - Normal interactive human turns use `cc_turn_origin=human;`. Verify the accepted origin pattern and any new categories.
   - Verify the conditions and order for optional gateway, project, and pre-compaction fields: `cc_gateway`, `cc_project`, `cc_project_src`, `cc_prev_msg`, `cc_prev_prompt_index`, and `cc_prev_turn_index`.
   - Do not add optional fields unless the extension can track the corresponding state accurately.

5. Compute expected suffixes for test fixtures.

   ```bash
   node - <<'NODE'
   const { createHash } = require('crypto');
   const SALT = '59cf53e54c78';
   const VERSION = '<version>';
   for (const msg of ['What day is it?', 'Second message']) {
     const sampled = [4, 7, 20].map(i => msg[i] || '0').join('');
     const suffix = createHash('sha256').update(SALT + sampled + VERSION).digest('hex').slice(0, 3);
     console.log({ msg, sampled, suffix });
   }
   NODE
   ```

6. Update the extension if needed.

   - `extensions/pi-cc-patch/index.ts`: update `CC_VERSION`, and only change algorithm constants if the audit proves they changed.
   - `extensions/pi-cc-patch/README.md`: update example version/header text.
   - `extensions/pi-cc-patch/index.test.ts`: update default-version header expectations. Keep explicit historical-version tests that check algorithm stability.
   - `extensions/pi-cc-patch/BILLING_HEADER_STATE_STRATEGY.md`: record the executable path, optional fields, and audit limits.

7. Run the tests for this project.

   ```bash
   # Run from the repository root.
   npm test -- --run extensions/pi-cc-patch/index.test.ts
   npm test
   ```

## Reporting

Summarize:

- Claude Code version inspected.
- Binary path inspected.
- Whether salt/sample positions/hash slice/header shape or request-attribution fields changed.
- Current expected header for `"What day is it?"`.
- Files updated.
