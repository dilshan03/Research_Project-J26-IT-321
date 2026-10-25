# Stops the isolated PP1 demo stack: the node/python processes listening on 5100, 5101 and 5174, and the
# MongoDB container. The normal development stack (5000-5002, 5173) is never touched.
#   -Reset   also deletes the container and its synthetic data (next start begins with an empty database).
param([switch]$Reset)

$Ports = @(5100, 5101, 5174)
foreach ($port in $Ports) {
    $owners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $owners) {
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc -and $proc.ProcessName -match '^(node|python[\d.]*)$') {
            Stop-Process -Id $procId -Force -Confirm:$false
            Write-Host "Stopped $($proc.ProcessName) (pid $procId) on port $port"
        } elseif ($proc) {
            Write-Warning "Port $port is held by '$($proc.ProcessName)' (pid $procId); not stopped."
        }
    }
}

docker stop mathquest-pp1-mongo 2>$null | Out-Null
if ($Reset) {
    docker rm -v mathquest-pp1-mongo 2>$null | Out-Null
    Write-Host 'PP1 MongoDB container and its synthetic data removed.'
} else {
    Write-Host 'PP1 MongoDB container stopped (data kept).'
}
Write-Host 'The PP1 service windows can now be closed.'
