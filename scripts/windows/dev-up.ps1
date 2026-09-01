<#
.SYNOPSIS
  Starts the local development infrastructure and reports honestly if it cannot.
#>
$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$compose  = Join-Path $repoRoot 'infrastructure\docker\docker-compose.yml'

Write-Host '== checking docker ==' -ForegroundColor Cyan
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  Write-Host 'BLOCKED: docker is not installed or not on PATH.' -ForegroundColor Red
  Write-Host 'See docs/foundation/09-local-development.md for the verified reason and'
  Write-Host 'the exact steps required to unblock it. Do not substitute a native'
  Write-Host 'PostgreSQL install without recording that decision.'
  exit 1
}

Write-Host '== starting postgres ==' -ForegroundColor Cyan
docker compose -f $compose up -d
if ($LASTEXITCODE -ne 0) { Write-Host 'FAILED to start compose services.' -ForegroundColor Red; exit 1 }

Write-Host '== waiting for health ==' -ForegroundColor Cyan
for ($i = 0; $i -lt 30; $i++) {
  $state = docker inspect -f '{{.State.Health.Status}}' mohalla-postgres 2>$null
  if ($state -eq 'healthy') { Write-Host 'postgres healthy' -ForegroundColor Green; exit 0 }
  Start-Sleep -Seconds 2
}
Write-Host 'postgres did not become healthy in 60s' -ForegroundColor Red
docker compose -f $compose logs --tail 40 postgres
exit 1
