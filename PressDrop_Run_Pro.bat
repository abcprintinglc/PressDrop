@echo off
setlocal
cd /d %~dp0

REM --- CONFIGURATION ---
set LOG=run_log.txt
set PORT=8000
REM ---------------------

echo =============================== > "%LOG%"
echo PressDrop Standalone Launcher >> "%LOG%"
echo =============================== >> "%LOG%"

REM 1. Check if Python is installed
python --version >> "%LOG%" 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo Please install Python 3.10+ from python.org and check "Add to PATH" during installation.
    pause
    exit /b 1
)

REM 2. Launch the standalone web app
set APP_URL=http://localhost:%PORT%/standalone/index.html

start "PressDrop Standalone" %APP_URL%

python -m http.server %PORT% >> "%LOG%" 2>&1

if errorlevel 1 (
    echo.
    echo [CRASH] The server closed unexpectedly.
    echo Check %LOG% for error details.
    pause
)
