# Personal Health Copilot - PowerShell Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       Personal Health Copilot - Starting Services       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Start Backend in new process
Write-Host "[*] Starting FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; Write-Host 'FastAPI Backend running on http://localhost:8000' -ForegroundColor Green; python -m uvicorn app.main:app --reload --port 8000"

Start-Sleep -Seconds 2

# 2. Start Frontend in new process
Write-Host "[*] Starting Vite Frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend'; Write-Host 'Vite Frontend running on http://localhost:5173' -ForegroundColor Cyan; cmd.exe /c 'npm run dev'"

Start-Sleep -Seconds 3

# 3. Open browser
Write-Host "[*] Launching browser: http://localhost:5173" -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Services are up and running!" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:5173"
Write-Host "  - Backend:  http://localhost:8000"
Write-Host "  - API Docs: http://localhost:8000/docs"
Write-Host "==========================================================" -ForegroundColor Cyan
