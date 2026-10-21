# Stops the isolated PP1 demo MongoDB container. Close the three service windows opened by start-pp1-local.ps1.
#   -Reset   also deletes the container and its synthetic data (next start begins with an empty database).
param([switch]$Reset)

docker stop mathquest-pp1-mongo | Out-Null
if ($Reset) {
    docker rm -v mathquest-pp1-mongo | Out-Null
    Write-Host 'PP1 MongoDB container and its synthetic data removed.'
} else {
    Write-Host 'PP1 MongoDB container stopped (data kept). Start again with start-pp1-local.ps1.'
}
