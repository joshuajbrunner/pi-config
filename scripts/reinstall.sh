#!/usr/bin/env bash
# Reinstall all third-party pi packages and re-apply extension filters.
# Source of truth for what's installed is ~/.pi/agent/settings.json on the
# original machine; this script reproduces that state on a fresh machine.
#
# Requirements: pi, jq

set -euo pipefail

if ! command -v pi >/dev/null 2>&1; then
  echo "error: 'pi' not found on PATH" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "error: 'jq' not found on PATH (brew install jq)" >&2
  exit 1
fi

SETTINGS="${HOME}/.pi/agent/settings.json"

# (source, filter-spec) pairs. Filter spec is empty if no filters.
# Filter syntax matches settings.json "extensions" array entries:
#   "-path/to/file.ts"  -> disable that extension
#   "+path/to/file.ts"  -> allowlist (only enable that extension)
PACKAGES=(
  "npm:pi-powerline-footer|"
  "npm:pi-mcp-adapter|-index.ts"
  "npm:@aliou/pi-guardrails|+src/index.ts"
  "npm:pi-extmgr|"
  "npm:pi-context|"
  "git:github.com/jonjonrankin/pi-caveman|-extensions/caveman.ts"
  "npm:pi-intercom|"
  "git:github.com/fluxgear/pi-thinking-steps|-index.ts"
  "npm:pi-cache-graph|"
  "npm:pi-cursor-agent|"
)

echo "==> Installing packages"
for entry in "${PACKAGES[@]}"; do
  source="${entry%%|*}"
  echo "  - pi install ${source}"
  pi install "${source}" || echo "    (already installed or failed; continuing)"
done

echo
echo "==> Applying extension filters in ${SETTINGS}"
if [[ ! -f "${SETTINGS}" ]]; then
  echo "error: ${SETTINGS} not found; run pi at least once first." >&2
  exit 1
fi

cp "${SETTINGS}" "${SETTINGS}.bak.$(date +%s)"

for entry in "${PACKAGES[@]}"; do
  source="${entry%%|*}"
  filter="${entry##*|}"
  [[ -z "${filter}" ]] && continue

  echo "  - ${source}: ${filter}"
  tmp="$(mktemp)"
  jq --arg src "${source}" --arg flt "${filter}" '
    .packages |= map(
      if (type == "string" and . == $src) then
        { source: $src, extensions: [$flt] }
      elif (type == "object" and .source == $src) then
        .extensions = [$flt]
      else . end
    )
  ' "${SETTINGS}" > "${tmp}" && mv "${tmp}" "${SETTINGS}"
done

echo
echo "Done. Backup saved alongside ${SETTINGS}."
echo "Tip: run 'pi list' to verify, or 'pi config' for an interactive view."
