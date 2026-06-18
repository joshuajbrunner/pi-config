#!/usr/bin/env bash
# Audit shipped artifacts for leaked planning vocabulary.
#
# Usage:
#   audit.sh [PLAN_DIR] [--staged]
#
#   PLAN_DIR   Path to the planning directory to EXCLUDE from the scan.
#              If omitted, the script auto-detects a common one.
#   --staged   Scan only staged changes (git diff --cached) instead of the
#              whole working tree.
#
# Exit status: 0 if clean, 1 if any leakage is found, 2 on usage error.
set -u

plan_dir=""
staged=0
for arg in "$@"; do
  case "$arg" in
    --staged) staged=1 ;;
    -*) echo "unknown flag: $arg" >&2; exit 2 ;;
    *) plan_dir="$arg" ;;
  esac
done

# Auto-detect the planning directory if not provided.
if [ -z "$plan_dir" ]; then
  for cand in docs/plans docs/stories tasks .agents/plans .stories plans; do
    if [ -d "$cand" ]; then plan_dir="$cand"; break; fi
  done
fi

# Plan-vocabulary patterns (case-insensitive, extended regex).
pattern='\b(story|phase|task) [0-9]|\bpattern [ab]\b|\bapproach [0-9]|\boption [0-9]\b|\bthe plan\b|per the (plan|design)'

if ! command -v rg >/dev/null 2>&1; then
  echo "error: ripgrep (rg) is required" >&2
  exit 2
fi

echo "Plan-leak audit"
echo "  plan dir (excluded): ${plan_dir:-<none detected>}"
echo "  scope: $([ "$staged" -eq 1 ] && echo 'staged changes' || echo 'working tree')"
echo

hits=0
if [ "$staged" -eq 1 ]; then
  # Scan added lines in the staged diff, skipping the plan dir.
  files=$(git diff --cached --name-only)
  for f in $files; do
    case "$f" in
      "$plan_dir"/*) continue ;;
    esac
    # Added lines only (leading '+', not the +++ header).
    matches=$(git diff --cached -U0 -- "$f" \
      | grep -E '^\+' | grep -Ev '^\+\+\+' \
      | grep -iEn "$pattern" || true)
    if [ -n "$matches" ]; then
      echo "  $f:"
      printf '%s\n' "$matches" | sed 's/^/    /'
      hits=1
    fi
  done
else
  glob_excl=()
  [ -n "$plan_dir" ] && glob_excl=(--glob "!$plan_dir/**")
  if rg -n -i "${glob_excl[@]}" "$pattern" .; then
    hits=1
  fi
fi

echo
if [ "$hits" -eq 0 ]; then
  echo "CLEAN: no plan vocabulary found in shipped files."
  exit 0
fi
echo "LEAKAGE FOUND. Triage each hit (deprecation notices and self-contained"
echo "definitions are OK); rewrite the rest to describe the mechanism, not the plan."
exit 1
