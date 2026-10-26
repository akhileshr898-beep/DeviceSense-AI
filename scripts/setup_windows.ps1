# DeviceSense AI - Automated Windows Setup Script
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Setting up DeviceSense AI on Windows" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Install Backend Dependencies
Write-Host "`n[1/3] Installing Python dependencies..." -ForegroundColor Yellow
python -m pip install -r "$PSScriptRoot\..\backend\requirements.txt"

# 2. Setup Frontend Dependencies
Write-Host "`n[2/3] Installing Frontend npm dependencies..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\..\frontend"
npm install

# 3. Train Initial IsolationForest ML Baseline
Write-Host "`n[3/3] Training Initial ML Anomaly Baseline..." -ForegroundColor Yellow
python "$PSScriptRoot\..\ml\train_detector.py"

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host " DeviceSense AI Setup Complete!" -ForegroundColor Green
Write-Host " Run '.\scripts\run_local.ps1' to launch all services." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
