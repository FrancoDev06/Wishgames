$ErrorActionPreference = 'Continue'

$root = "C:\Users\franc\Desktop\Wish\WishGames"
$backendDir = Join-Path $root "apps\backend"
$edgeExe = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$backendLog = Join-Path $root "backend.log"

function Test-Port($port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $result = $client.BeginConnect("localhost", $port, $null, $null)
        $ok = $result.AsyncWaitHandle.WaitOne(300)
        $client.Close()
        return $ok
    } catch { return $false }
}

function Test-PgReady {
    docker exec collect_play_postgres pg_isready -U roydev -d collect_play_db *> $null
    return $LASTEXITCODE -eq 0
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

Write-Host "Attente que Postgres accepte les connexions..."
$elapsed = 0
while (-not (Test-PgReady) -and $elapsed -lt 30) {
    Start-Sleep -Seconds 2
    $elapsed += 2
}
if (-not (Test-PgReady)) {
    Write-Host "ERREUR : Postgres n'a pas repondu a temps. Le backend risque de planter au demarrage."
}

# 3. Backend (port 6001)
if (-not (Test-Port 6001)) {
    Write-Host "Demarrage du backend..."
    Remove-Item $backendLog -ErrorAction SilentlyContinue
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$backendDir`" && bun run start >> `"$backendLog`" 2>&1" -WindowStyle Minimized
    $elapsed = 0
    while (-not (Test-Port 6001) -and $elapsed -lt 60) {
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
    if (-not (Test-Port 6001)) {
        Write-Host "ERREUR : le backend n'a pas demarre a temps. Voir $backendLog pour le detail."
        Start-Process notepad.exe $backendLog
        Start-Sleep -Seconds 5
        exit 1
    }
} else {
    Write-Host "Backend deja actif."
}

# 4. Ouverture de l'application
# Le backend sert lui-meme le build Angular (meme origine, cf. routes.util.ts) :
# pas besoin d'un serveur statique separe, sinon les appels API relatifs du build
# prod (apiOrigin: '') partent vers le mauvais port et echouent silencieusement.
Write-Host "Ouverture de WishGames..."
if (Test-Path $edgeExe) {
    Start-Process -FilePath $edgeExe -ArgumentList "--app=http://localhost:6001"
} else {
    Start-Process "http://localhost:6001"
}

Start-Sleep -Seconds 2
