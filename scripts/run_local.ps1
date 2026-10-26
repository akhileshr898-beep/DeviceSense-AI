# DeviceSense AI - Local Windows Launch Script
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Launching DeviceSense AI Local Diagnostic Suite" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $PSScriptRoot

# 1. Start Flask API Backend
Write-Host "[1/3] Starting Flask API Backend (127.0.0.1:5000)..." -ForegroundColor Green
$backendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; python run.py" -PassThru

Start-Sleep -Seconds 2

# 2. Start Local Monitoring Agent
Write-Host "[2/3] Starting Local Monitoring Agent..." -ForegroundColor Green
$agentProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\agent'; python main.py" -PassThru

# 3. Start Vite React Dashboard
Write-Host "[3/3] Starting React Dashboard (http://localhost:5173)..." -ForegroundColor Green
$frontendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend'; npm run dev" -PassThru

Write-Host "`nAll 3 components started in separate background windows:" -ForegroundColor Cyan
Write-Host "  - Flask API:   http://127.0.0.1:5000"
Write-Host "  - Dashboard:   http://localhost:5173"
Write-Host "  - Agent:       Active background collector (psutil)"
Write-Host "`nPress Ctrl+C or close the windows to stop."

