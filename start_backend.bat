@echo off
echo ===================================================
echo [INFO] Starting ColorOn Local Backend Server...
echo ===================================================
adb reverse tcp:5000 tcp:5000 2>nul
cd backend
node server.js

