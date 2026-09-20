@echo off
cd /d "%~dp0"
echo Starting PALAWANSU at http://localhost:3000/
echo Press Ctrl+C to stop.
call npm run dev
pause
