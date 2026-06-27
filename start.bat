@echo off
echo ========================================
echo   WAM - Windows Android-project Manager
echo   Starting Development Environment...
echo ========================================
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

:: Check node_modules
if not exist "node_modules" (
    echo [INFO] First run, installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Start application
echo [START] Starting WAM...
call npm run electron:dev

pause
