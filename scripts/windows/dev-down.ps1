<#
.SYNOPSIS
  Stops local development infrastructure. Data volume is preserved.
#>
$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$compose  = Join-Path $repoRoot 'infrastructure\docker\docker-compose.yml'
docker compose -f $compose down
Write-Host 'stopped. the data volume mohalla-postgres-data was NOT removed.' -ForegroundColor Yellow
Write-Host 'to discard data: docker volume rm mohalla-postgres-data'
