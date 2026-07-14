$ErrorActionPreference = 'Continue'

$root = "C:\Users\FrancoisPG\Desktop\Test\WishGames"
$backendDir = Join-Path $root "apps\backend"
$frontendDist = Join-Path $root "apps\frontend\dist\fronted\browser"
$edgeExe = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

function Test-Port($port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $result = $client.BeginConnect("localhost", $port, $null, $null)
        $ok = $result.AsyncWaitHandle.WaitOne(300)
        $client.Close()
        return $ok
    } catch { return $false }
}

Write-Host "=== WishGames : demarrage ==="

# 1. Docker Desktop
Write-Host "Verification de Docker..."
docker version --format '{{.Server.Version}}' *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lancement de Docker Desktop (peut prendre 30-60s)..."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    $elapsed = 0
    while ($elapsed -lt 90) {
        Start-Sleep -Seconds 3
        $elapsed += 3
        docker version --format '{{.Server.Version}}' *> $null
        if ($LASTEXITCODE -eq 0) { break }
    }
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR : Docker n'a pas demarre a temps. Reessaie de lancer le raccourci dans une minute."
    Start-Sleep -Seconds 5
    exit 1
}

# 2. Postgres container
Write-Host "Demarrage du conteneur collect_play_postgres..."
docker start collect_play_postgres | Out-Null

# 3. Backend (port 6001)
if (-not (Test-Port 6001)) {
    Write-Host "Demarrage du backend..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$backendDir`" && bun run start" -WindowStyle Minimized
    $elapsed = 0
    while (-not (Test-Port 6001) -and $elapsed -lt 60) {
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
} else {
    Write-Host "Backend deja actif."
}

# 4. Serveur frontend (build prod, port 5050)
if (-not (Test-Port 5050)) {
    Write-Host "Demarrage du serveur frontend..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx http-server `"$frontendDist`" -p 5050 -s" -WindowStyle Minimized
    $elapsed = 0
    while (-not (Test-Port 5050) -and $elapsed -lt 60) {
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
} else {
    Write-Host "Serveur frontend deja actif."
}

# 5. Ouverture de l'application
Write-Host "Ouverture de WishGames..."
if (Test-Path $edgeExe) {
    Start-Process -FilePath $edgeExe -ArgumentList "--app=http://localhost:5050"
} else {
    Start-Process "http://localhost:5050"
}

Start-Sleep -Seconds 2
