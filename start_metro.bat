@echo off
echo [INFO] Resetting Metro Cache and setting up ADB port forwarding...
adb reverse tcp:8081 tcp:8081
npx react-native start --reset-cache
