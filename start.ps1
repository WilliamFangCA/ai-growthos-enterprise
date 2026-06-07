# AI GrowthOS Enterprise - Windows One-Click Launcher
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== AI GrowthOS Enterprise ===" -ForegroundColor Cyan
Write-Host ""

# Kill existing processes on ports 4000 and 3000 to avoid conflicts
@(4000, 3000) | ForEach-Object {
    $port = $_
    $pid_ = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).OwningProcess
    if ($pid_) {
        Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
        Write-Host "Freed port $port" -ForegroundColor DarkGray
    }
}
Start-Sleep 1

# Install dependencies if node_modules missing
if (-not (Test-Path "$root\backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location "$root\backend"; npm install; Pop-Location
}
if (-not (Test-Path "$root\frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location "$root\frontend"; npm install; Pop-Location
}
if (-not (Test-Path "$root\node_modules")) {
    Push-Location $root; npm install; Pop-Location
}

$backendDir = "$root\backend"
$frontendDir = "$root\frontend"

Write-Host "Starting backend on port 4000..." -ForegroundColor Yellow
$backendCmd = "Set-Location '$backendDir'; Write-Host 'Backend starting...' -ForegroundColor Cyan; node src/index.js"
Start-Process powershell -ArgumentList '-NoExit', '-Command', $backendCmd -WindowStyle Normal

Start-Sleep 2

Write-Host "Starting frontend on port 3000..." -ForegroundColor Yellow
$frontendCmd = "Set-Location '$frontendDir'; Write-Host 'Frontend starting...' -ForegroundColor Cyan; npx vite --port 3000"
Start-Process powershell -ArgumentList '-NoExit', '-Command', $frontendCmd -WindowStyle Normal

Write-Host ""
Write-Host "Backend API:  http://localhost:4000" -ForegroundColor Green
Write-Host "Frontend App: http://localhost:3000" -ForegroundColor Green
Write-Host "Firebase:     ai-growthos-enterprise.firebaseapp.com" -ForegroundColor Green
Write-Host ""
Write-Host "Opening browser in 5 seconds..." -ForegroundColor Yellow
Start-Sleep 5
Start-Process "http://localhost:3000"
