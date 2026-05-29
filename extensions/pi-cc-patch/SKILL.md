# Claude Code Billing Header Audit

Use this skill when maintaining `extensions/pi-cc-patch` or when asked whether Claude Code changed its billing/attribution header algorithm.

## Goal

Verify the installed Claude Code CLI's billing header construction against the extension's constants and tests, especially after a Claude Code update.

## Procedure

1. Locate the real Claude Code executable/version.

   ```bash
   which claude
   claude --version
   find ~/.local/share/claude/versions -maxdepth 1 -type f -o -type l | sort
   ```

   If `which claude` points at the cmux wrapper, inspect `~/.local/bin/claude` and `~/.local/share/claude/versions/<version>` instead.

2. Search the current and previous binaries for billing-header markers.

   ```bash
   rg -a -n "cc_version|cc_entrypoint|x-anthropic-billing-header|59cf53e54c78|cc_workload" \
     ~/.local/share/claude/versions/<version>
   ```

   If output is too large, use byte offsets:

   ```bash
   grep -aob 'x-anthropic-billing-header\|cc_version\|cc_entrypoint\|59cf53e54c78\|cc_workload' \
     ~/.local/share/claude/versions/<version>
   ```

3. Extract nearby deminified JavaScript around the relevant offsets.

   ```bash
   python3 - <<'PY'
   from pathlib import Path
   version = '<version>'
   path = Path.home()/'.local/share/claude/versions'/version
   text = path.read_bytes().decode('utf-8', 'ignore')
   for term in ['function er_', 'x-anthropic-billing-header', '59cf53e54c78']:
       i = text.find(term)
       print('\n---', term, i, '---')
       print(text[max(0, i-500):i+1500] if i >= 0 else 'not found')
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
   - `extensions/pi-cc-patch/index.test.ts`: update default-version header expectations. Keep explicit historical-version tests if they are intentionally checking algorithm stability.

7. Run the tests for this project.

   ```bash
   cd ~/Projects/pi-config
   npm test -- --run extensions/pi-cc-patch/index.test.ts
   ```

## Reporting

Summarize:

- Claude Code version inspected.
- Binary path inspected.
- Whether salt/sample positions/hash slice/header shape changed.
- Current expected header for `"What day is it?"`.
- Files updated.
