Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Building VMS Production Release AAB (app-release.aab)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Setting parallel build limits to prevent compiler memory exhaustion..." -ForegroundColor Yellow
$env:CMAKE_BUILD_PARALLEL_LEVEL = 1

Write-Host "Running gradle bundleRelease in the android folder..." -ForegroundColor Yellow
cd android
.\gradlew bundleRelease

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "---------------------------------------------------" -ForegroundColor Red
    Write-Host "  BUILD FAILED! Please check the errors above." -ForegroundColor Red
    Write-Host "---------------------------------------------------" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host "Output AAB is located at:" -ForegroundColor White
Write-Host "$PSScriptRoot\android\app\build\outputs\bundle\release\app-release.aab" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit..."

