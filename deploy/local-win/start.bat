@echo off
set "CB=chcp 65001 >nul"
%CB%
title AI Novel Studio
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "SERVER_JS="
set "WORK_DIR="

if exist "%SCRIPT_DIR%server\main.js" (
    set "SERVER_JS=%SCRIPT_DIR%server\main.js"
    set "WORK_DIR=%SCRIPT_DIR%"
)

if not defined SERVER_JS (
    for %%i in ("%SCRIPT_DIR%..") do set "PARENT=%%~fi"
    if exist "!PARENT!\apps\server\dist\main.js" (
        set "SERVER_JS=!PARENT!\apps\server\dist\main.js"
        set "WORK_DIR=!PARENT!"
    )
)

if not defined SERVER_JS (
    echo [ERROR] Cannot find server/main.js.
    echo Please run build.bat first, or run from project root.
    pause
    exit /b 1
)

cd /d "!WORK_DIR!"

if not exist ".env" (
    echo [INIT] Generating .env...
    node -e "require(""crypto"").randomBytes(48).toString(""hex"")" > _jwt.tmp
    set /p NS=<_jwt.tmp 2>nul
    del _jwt.tmp 2>nul
    (
        echo APP_MODE=local
        echo PORT=18765
        echo DATABASE_URL=file:./data/novel.db
        echo STORAGE_DRIVER=local
        echo STORAGE_LOCAL_PATH=./data/uploads
        echo QUEUE_DRIVER=sqlite
        echo AUTH_MODE=local
        echo JWT_SECRET=!NS!
        echo JWT_EXPIRES_IN=7d
        echo APP_SECRET=!NS!
        echo KNOWLEDGE_PATH=./knowledge
        echo KNOWLEDGE_RETRIEVAL_MODE=fts
        echo LOG_LEVEL=info
    ) ^> .env
    echo [INIT] .env created.
)

if not exist "node_modules" (
    echo [INIT] Installing dependencies...
    call npm install --production
)

if not exist "node_modules\.prisma\client\index.js" (
    echo [INIT] Generating Prisma client...
    if exist "prisma\schema.prisma" if exist "node_modules\prisma\build\index.js" node node_modules\prisma\build\index.js generate --schema=prisma\schema.prisma
)

if not exist "data" mkdir data 2>nul
if not exist "data\uploads" mkdir data\uploads 2>nul
if not exist "data\backups" mkdir data\backups 2>nul

if exist "prisma\schema.prisma" if exist "node_modules\prisma\build\index.js" (
    echo [INIT] Syncing database schema...
    node node_modules\prisma\build\index.js db push --accept-data-loss --schema=prisma\schema.prisma --skip-generate >nul 2>&1
    node node_modules\prisma\build\index.js generate --schema=prisma\schema.prisma >nul 2>&1
    echo [INIT] Database schema synced.
)

echo.
echo ========================================
echo   AI Novel Studio v0.1.0
echo ========================================
echo.
echo Working dir: !WORK_DIR!
echo Entry: !SERVER_JS!
echo.

rem Node.js module lookup: try WORK_DIR first, then fallback to parent
set "NODE_PATH=!WORK_DIR!\node_modules"
if not exist "!NODE_PATH!" (
    for %%i in ("!WORK_DIR!..") do set "PARENT_MODULES=%%~fi\node_modules"
    if exist "!PARENT_MODULES!" set "NODE_PATH=!PARENT_MODULES!"
)

echo [START] Launching server...
start "" "http://127.0.0.1:18765"
node "!SERVER_JS!"

echo.
echo Server stopped.
pause
