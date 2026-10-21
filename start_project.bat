@echo off
title Face and Voice Attendance System Launcher
echo ========================================================
echo   Starting Face ^& Voice Attendance System
echo ========================================================

echo 1. Launching Backend Server (FastAPI on 0.0.0.0:8000)...
start "Backend (FastAPI)" cmd /k "cd /d "%~dp0enterprise_app\backend" && .\venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo 2. Launching Frontend Server (Next.js on 0.0.0.0:3000)...
start "Frontend (Next.js)" cmd /k "cd /d "%~dp0enterprise_app\frontend" && npm run dev"

echo.
echo ========================================================
echo   Servers are launching in separate windows!
echo.
echo   [PC Access]
echo   - Frontend:    http://localhost:3000
echo   - Backend API: http://localhost:8000
echo   - API Docs:    http://localhost:8000/docs
echo.
echo   [Phone Access on Wi-Fi/LAN]
echo   - Frontend:    http://10.104.56.74:3000
echo   - Backend API: http://10.104.56.74:8000
echo   - API Docs:    http://10.104.56.74:8000/docs
echo ========================================================
echo.
pause
