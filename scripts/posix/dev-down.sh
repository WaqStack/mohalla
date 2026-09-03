#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
docker compose -f "$repo_root/infrastructure/docker/docker-compose.yml" down
echo 'stopped. the data volume mohalla-postgres-data was NOT removed.'
echo 'to discard data: docker volume rm mohalla-postgres-data'
