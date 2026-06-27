@echo off
echo ========================================
echo   WAM Cleanup and Start Tool
echo ========================================
echo.

echo [1] Cleaning up processes...
echo.

:: Clean Node.js processes
tasklist | findstr node.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [+] Found Node.js processes, cleaning...
    taskkill /F /IM node.exe >nul 2>nul
    echo [OK] Node.js processes cleaned
) else (
    echo [OK] No Node.js processes to clean
)

echo.

:: Clean Electron processes
tasklist | findstr electron.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [+] Found Electron processes, cleaning...
    taskkill /F /IM electron.exe >nul 2>nul
    echo [OK] Electron processes cleaned
) else (
    echo [OK] No Electron processes to clean
)

echo.
echo [2] Waiting for ports to release...
timeout /t 3 /nobreak >nul

echo.
echo [3] Starting WAM application...
echo.

call npm run electron:dev

pause
