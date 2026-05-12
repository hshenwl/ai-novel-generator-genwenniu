@echo off
chcp 65001 >nul
title AI Novel Studio - Stop

echo Stopping AI Novel Studio...

set "FOUND_PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":18765 " ^| findstr LISTENING') do (
    set "FOUND_PID=%%a"
)

if defined FOUND_PID (
    echo Stopping PID: %FOUND_PID%
    taskkill /F /PID %FOUND_PID% 2>nul
) else (
    echo No running service found.
)

timeout /t 2 >nul
