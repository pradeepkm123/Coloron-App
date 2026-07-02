@echo off
echo ========================================
echo Network Device Scanner
echo ========================================
echo.
echo Finding devices on your network...
echo.

arp -a | findstr "dynamic"

echo.
echo ========================================
echo Look for your camera's IP address above
echo It's usually something like:
echo   192.168.1.xxx
echo   192.168.0.xxx
echo   10.0.0.xxx
echo ========================================
echo.
pause
