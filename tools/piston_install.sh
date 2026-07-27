#!/usr/bin/env bash
# Install the DSA language runtimes into a running Piston via its HTTP API.
# Piston ships with none, so /dsa/run|test|submit 400s on every language until
# these are installed. Idempotent — already-installed packages are skipped.
#
# Keep PACKAGES in sync with:
#   - backend/app/utils/piston_client.py  (LANGUAGE_ALIASES)
#   - frontend/src/features/interview/components/DsaPanel.tsx  (LANGUAGES)
set -euo pipefail

PISTON_URL="${PISTON_URL:-http://localhost:2000}"

# (piston package, version) — see git history for why each version is pinned.
PACKAGES=(
  "python 3.12.0"     # -> python
  "gcc 10.2.0"        # -> c, c++
  "java 15.0.2"       # -> java
  "node 20.11.1"      # -> javascript
  "typescript 5.0.3"  # -> typescript
  "go 1.16.2"         # -> go
  "bash 5.2.0"        # -> bash
  "mono 6.12.0"       # -> csharp
)

command -v jq >/dev/null 2>&1 || {
  echo "✘ jq is required (e.g. 'sudo apt install jq')." >&2
  exit 1
}

echo "⏳ Waiting for Piston at $PISTON_URL ..."
for _ in $(seq 1 90); do
  curl -sf "$PISTON_URL/api/v2/runtimes" >/dev/null 2>&1 && break
  sleep 2
done
curl -sf "$PISTON_URL/api/v2/runtimes" >/dev/null 2>&1 || {
  echo "✘ Piston never became reachable at $PISTON_URL." >&2
  exit 1
}

# /api/v2/packages is keyed by (language, version) with an authoritative
# "installed" flag — the exact identity we install by. (/api/v2/runtimes uses a
# different namespace: gcc->c/c++, node->javascript, mono->csharp.)
installed="$(curl -s "$PISTON_URL/api/v2/packages" \
  | jq -r '.[] | select(.installed) | "\(.language) \(.language_version)"')"

for pkg in "${PACKAGES[@]}"; do
  lang="${pkg%% *}"
  ver="${pkg##* }"
  if grep -qxF "$lang $ver" <<<"$installed"; then
    echo "  ✓ $lang $ver already installed"
    continue
  fi
  echo "  ↓ installing $lang $ver ..."
  if curl -s -X POST "$PISTON_URL/api/v2/packages" \
    -H 'Content-Type: application/json' \
    -d "{\"language\":\"$lang\",\"version\":\"$ver\"}" >/dev/null; then
    echo "    installed"
  else
    echo "    ⚠ failed to install $lang $ver (continuing)" >&2
  fi
done

echo "✅ Piston languages ready."
