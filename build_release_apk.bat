@echo off
echo ===================================================
echo   Building VMS Production Release APK (app-release.apk)
echo ===================================================
echo.
echo Setting parallel build limits to prevent compiler memory exhaustion...
set CMAKE_BUILD_PARALLEL_LEVEL=1

echo.
echo Running gradle build in the android folder...
cd "%~dp0android"
call gradlew.bat assembleRelease --no-daemon

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ---------------------------------------------------
    echo   BUILD FAILED! Please check the errors above.
    echo ---------------------------------------------------
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo   BUILD SUCCESSFUL!
echo ===================================================
echo Output APK is located at:
echo %~dp0android\app\build\outputs\apk\release\app-release.apk
echo.
pause
