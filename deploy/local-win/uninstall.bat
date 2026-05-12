@echo off
chcp 65001 >nul
title AI Novel Studio - Uninstall

echo ========================================
echo   Uninstall AI Novel Studio v0.1.0
echo ========================================
echo.

echo [1/4] Stopping service...
call "%~dp0stop.bat" >nul 2>&1
echo   OK

echo [2/4] Removing program files...
set "INSTALL_DIR=%LOCALAPPDATA%\AI-Novel-Studio"
if exist "%INSTALL_DIR%" (
    rmdir /S /Q "%INSTALL_DIR%" 2>nul
    echo   Deleted: %INSTALL_DIR%
) else (
    echo   Not found.
)
echo   OK

echo [3/4] Removing desktop shortcut...
if exist "%USERPROFILE%\Desktop\AI Novel Studio.lnk" (
    del /F /Q "%USERPROFILE%\Desktop\AI Novel Studio.lnk" 2>nul
)
echo   OK

echo [4/4] Removing Start Menu items...
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\AI Novel Studio" (
    rmdir /S /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\AI Novel Studio" 2>nul
)
echo   OK

echo.
echo Uninstall complete.
pause
