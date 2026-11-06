@echo off
echo [INFO] Resetting Metro Cache and setting up ADB port forwarding...
adb reverse tcp:8081 tcp:8081 2>nul
adb reverse tcp:5000 tcp:5000 2>nul
npx react-native start --reset-cache
