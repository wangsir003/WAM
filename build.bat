@echo off
echo ========================================
echo   WAM - Build Windows Application
echo ========================================
echo.

echo [INFO] Checking environment...
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found, please install Node.js first
    pause
    exit /b 1
)

:: Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm not found
    pause
    exit /b 1
)

echo [OK] Environment check passed
echo.

echo [INFO] Starting build...
echo [INFO] This may take 3-5 minutes, please wait...
echo.

:: Execute build
call npm run build:win

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   BUILD SUCCESS!
    echo ========================================
    echo.
    echo [SUCCESS] Output directory: .\pkg\
    echo.
    echo Generated files:
    echo   - WAM-1.0.0-win-x64.exe      (Installer)
    echo   - WAM-1.0.0-portable.exe    (Portable)
    echo.

    :: Open output directory
    start explorer .\pkg
) else (
    echo.
    echo [ERROR] Build failed, please check error messages above
    echo.
)

pause
