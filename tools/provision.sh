#!/usr/bin/env bash
# One-shot local provision: start the stack, migrate, install Piston languages,
# and seed the database. Safe to re-run.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd "$here/.."  # repo root

echo "▶ Starting containers..."
docker compose up -d --build

echo "▶ Waiting for the API at http://localhost:8000 ..."
for _ in $(seq 1 120); do
  curl -s -o /dev/null http://localhost:8000/ 2>/dev/null && break
  sleep 2
done
curl -s -o /dev/null http://localhost:8000/ 2>/dev/null || {
  echo "✘ API never came up on :8000 — check 'docker compose logs api'." >&2
  exit 1
}

echo "▶ Applying migrations..."
docker compose exec -T api alembic upgrade head

echo "▶ Installing Piston languages..."
"$here/piston_install.sh"

echo "▶ Seeding the database..."
"$here/seed.sh"

echo "✅ Provision complete — frontend http://localhost:8080 · API http://localhost:8000"
