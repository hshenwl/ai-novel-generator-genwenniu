@echo off
chcp 65001 >nul
title AI Novel Studio - Build

echo ========================================
echo   Building AI Novel Studio v0.1.0
echo ========================================
echo.

set "ROOT_DIR=%~dp0..\.."
set "DIST_DIR=%ROOT_DIR%\dist"

echo [1/6] Installing dependencies...
cd /d "%ROOT_DIR%"
call pnpm install
echo   OK
echo.

echo [2/6] Building packages...
cd /d "%ROOT_DIR%"
call pnpm build
echo   OK
echo.

echo [3/6] Generating Prisma client...
cd /d "%ROOT_DIR%"
call pnpm db:generate
echo   OK
echo.

echo [4/6] Creating dist directory...
if exist "%DIST_DIR%" rmdir /S /Q "%DIST_DIR%"
mkdir "%DIST_DIR%"
mkdir "%DIST_DIR%\server"
mkdir "%DIST_DIR%\web"
mkdir "%DIST_DIR%\prisma"
mkdir "%DIST_DIR%\data"
mkdir "%DIST_DIR%\data\uploads"
mkdir "%DIST_DIR%\data\backups"
echo   OK
echo.

echo [5/6] Copying build artifacts...
xcopy /E /I /Y "%ROOT_DIR%\apps\server\dist\*" "%DIST_DIR%\server\" >nul
echo   - Server OK
xcopy /E /I /Y "%ROOT_DIR%\apps\web\dist\*" "%DIST_DIR%\web\" >nul
echo   - Web OK

rem Copy workspace packages (fix main field to point to root index.js)
mkdir "%DIST_DIR%\node_modules\@ai-novel" 2>nul
for %%p in (ai-gateway seven-step-engine workflow-engine knowledge-base) do (
    if exist "%ROOT_DIR%\packages\%%p\dist" (
        mkdir "%DIST_DIR%\node_modules\@ai-novel\%%p" 2>nul
        xcopy /E /I /Y "%ROOT_DIR%\packages\%%p\dist\*" "%DIST_DIR%\node_modules\@ai-novel\%%p\" >nul
        echo {"main":"./index.js"} > "%DIST_DIR%\node_modules\@ai-novel\%%p\package.json"
    )
)
echo   - Workspace packages OK

rem Generate package.json for production dependencies
cd /d "%DIST_DIR%"
echo { > package.json
echo   "name": "ai-novel-studio", >> package.json
echo   "version": "1.4.8", >> package.json
echo   "private": true, >> package.json
echo   "scripts": { "start": "node server/main.js" }, >> package.json
echo   "dependencies": { >> package.json
echo     "@nestjs/common": "^11.0.0", >> package.json
echo     "@nestjs/config": "^4.0.0", >> package.json
echo     "@nestjs/core": "^11.0.0", >> package.json
echo     "@nestjs/jwt": "^11.0.0", >> package.json
echo     "@nestjs/passport": "^11.0.0", >> package.json
echo     "@nestjs/platform-express": "^11.0.0", >> package.json
echo     "@nestjs/swagger": "^11.0.0", >> package.json
echo     "@prisma/client": "^6.0.0", >> package.json
echo     "axios": "^1.6.0", >> package.json
echo     "bcryptjs": "^2.4.3", >> package.json
echo     "class-transformer": "^0.5.1", >> package.json
echo     "class-validator": "^0.14.1", >> package.json
echo     "passport": "^0.7.0", >> package.json
echo     "passport-jwt": "^4.0.1", >> package.json
echo     "prisma": "^6.0.0", >> package.json
echo     "reflect-metadata": "^0.2.1", >> package.json
echo     "rxjs": "^7.8.1", >> package.json
echo     "swagger-ui-express": "^5.0.1" >> package.json
echo   } >> package.json
echo } >> package.json

echo   Installing npm dependencies in dist...
call npm install --production --legacy-peer-deps 2>nul
if %errorLevel% neq 0 call npm install --production
echo   - npm dependencies OK

rem Re-copy workspace packages (npm install may have cleaned node_modules/@ai-novel)
mkdir "%DIST_DIR%\node_modules\@ai-novel" 2>nul
for %%p in (ai-gateway seven-step-engine workflow-engine knowledge-base) do (
    if exist "%ROOT_DIR%\packages\%%p\dist" (
        mkdir "%DIST_DIR%\node_modules\@ai-novel\%%p" 2>nul
        xcopy /E /I /Y "%ROOT_DIR%\packages\%%p\dist\*" "%DIST_DIR%\node_modules\@ai-novel\%%p\" >nul
        echo {"main":"./index.js"} > "%DIST_DIR%\node_modules\@ai-novel\%%p\package.json"
    )
)
echo   - Workspace packages re-applied OK

rem Generate Prisma client in dist
echo   Generating Prisma client...
if exist "prisma\schema.prisma" if exist "node_modules\prisma\build\index.js" node node_modules\prisma\build\index.js generate --schema=prisma\schema.prisma
echo   - Prisma client OK
copy /Y "%ROOT_DIR%\apps\server\prisma\schema.prisma" "%DIST_DIR%\prisma\" >nul
echo   - Prisma OK
if exist "%ROOT_DIR%\resources\rules" xcopy /E /I /Y "%ROOT_DIR%\resources\rules\*" "%DIST_DIR%\resources\rules\" >nul
if exist "%ROOT_DIR%\resources\prompts" xcopy /E /I /Y "%ROOT_DIR%\resources\prompts\*" "%DIST_DIR%\resources\prompts\" >nul
if exist "%ROOT_DIR%\knowledge" xcopy /E /I /Y "%ROOT_DIR%\knowledge\*" "%DIST_DIR%\knowledge\" >nul
echo   - Resources OK
copy /Y "%~dp0start.bat" "%DIST_DIR%\" >nul
copy /Y "%~dp0stop.bat" "%DIST_DIR%\" >nul
echo   - Scripts OK
echo   OK
echo.

echo [6/6] Generating .env template...
cd /d "%DIST_DIR%"
node -e "require(""crypto"").randomBytes(48).toString(""hex"")" > _jwt.tmp
set /p JWT=<_jwt.tmp 2>nul
del _jwt.tmp 2>nul
( ^
echo APP_MODE=local
echo PORT=18765
echo DATABASE_URL=file:./data/novel.db
echo STORAGE_DRIVER=local
echo STORAGE_LOCAL_PATH=./data/uploads
echo QUEUE_DRIVER=sqlite
echo AUTH_MODE=local
echo JWT_SECRET=%JWT%
echo JWT_EXPIRES_IN=7d
echo APP_SECRET=%JWT%
echo KNOWLEDGE_PATH=./knowledge
echo KNOWLEDGE_RETRIEVAL_MODE=fts
echo LOG_LEVEL=info
) > .env
cd /d "%ROOT_DIR%"
echo   OK
echo.

echo ========================================
echo   Build complete!
echo ========================================
echo.
echo Output: %DIST_DIR%
echo.
echo To install:
echo   1. cd dist
echo   2. right-click install.bat ^> Run as Admin
echo.
pause
