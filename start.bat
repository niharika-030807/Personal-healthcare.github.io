@echo off
TITLE Personal Health Copilot - Launcher
COLOR 0A

echo ==========================================================
echo        Personal Health Copilot - Starting Services
echo ==========================================================
echo.

REM 1. Start FastAPI Backend Server
echo [*] Starting FastAPI Backend on http://localhost:8000 ...
start "Health Copilot - Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --port 8000"

REM 2. Wait 2 seconds for backend to initialize
timeout /t 2 /nobreak >nul

REM 3. Start React + Vite Frontend Server
echo [*] Starting Vite Frontend on http://localhost:5173 ...
start "Health Copilot - Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

REM 4. Wait 3 seconds then open browser
timeout /t 3 /nobreak >nul
echo.
echo [*] Opening application in browser: http://localhost:5173
start http://localhost:5173

echo.
echo ==========================================================
echo   Services are running!
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:8000
echo   - API Docs: http://localhost:8000/docs
echo ==========================================================
echo Keep the terminal windows open while using the app.
pause
