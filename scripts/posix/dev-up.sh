#!/usr/bin/env bash
# Starts the local development infrastructure and reports honestly if it cannot.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
compose="$repo_root/infrastructure/docker/docker-compose.yml"

echo '== checking docker =='
if ! command -v docker >/dev/null 2>&1; then
  echo 'BLOCKED: docker is not installed or not on PATH.' >&2
  echo 'See docs/foundation/09-local-development.md for the verified reason.' >&2
  exit 1
fi

echo '== starting postgres =='
docker compose -f "$compose" up -d

echo '== waiting for health =='
for _ in $(seq 1 30); do
  state="$(docker inspect -f '{{.State.Health.Status}}' mohalla-postgres 2>/dev/null || echo unknown)"
  if [ "$state" = healthy ]; then echo 'postgres healthy'; exit 0; fi
  sleep 2
done

echo 'postgres did not become healthy in 60s' >&2
docker compose -f "$compose" logs --tail 40 postgres
exit 1
