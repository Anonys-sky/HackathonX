# SquirryCoach — one-command local start (Windows)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "`n=== SquirryCoach ===" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js not found. Install from https://nodejs.org"
}
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Error "Python not found. Install Python 3.10+ and add to PATH"
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing npm packages..." -ForegroundColor Yellow
  npm install --legacy-peer-deps
}

Write-Host "Installing Python packages..." -ForegroundColor Yellow
python -m pip install -r backend/requirements.txt -q

foreach ($port in @(8000, 3000)) {
  $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) {
    Write-Host "Port $port is in use (PID $($conn.OwningProcess)). Stop old servers or close that terminal." -ForegroundColor Yellow
  }
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example — add your LLM_API_KEY" -ForegroundColor Yellow
}

Write-Host "`nStarting API (8000) + web (3000)..." -ForegroundColor Green
Write-Host "Open http://localhost:3000 (or 3001 if 3000 is busy)`n" -ForegroundColor Green
npm run dev
