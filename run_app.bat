@echo off
title Diabetes Risk Prediction Launcher
echo ========================================================
echo    Diabetes Risk Prediction System Launcher
echo ========================================================
echo.

:: Detect Python executable
set "PYTHON_EXE="
where python >nul 2>&1 && set "PYTHON_EXE=python"
if not defined PYTHON_EXE (
    where py >nul 2>&1 && set "PYTHON_EXE=py"
)

if not defined PYTHON_EXE (
    echo [ERROR] Python was not found in your system PATH!
    echo Please install Python 3.10+ from https://www.python.org
    echo and ensure "Add Python to PATH" is checked during installation.
    pause
    exit /b 1
)

echo [1/2] Starting Python FastAPI Backend on http://localhost:8000...
start "Diabetes Risk API (Port 8000)" cmd /k "%PYTHON_EXE% main.py"

echo Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak >nul

echo [2/2] Starting React Frontend on http://localhost:3000...
cd frontend
start "Diabetes Risk UI (Port 3000)" cmd /k "npm run dev"

echo.
echo ========================================================
echo System starting up:
echo   - Backend API:  http://localhost:8000
echo   - API Docs:     http://localhost:8000/docs
echo   - Frontend App: http://localhost:3000
echo ========================================================
echo Opening http://localhost:3000 in your browser...
start http://localhost:3000

