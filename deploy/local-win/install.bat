@echo off
chcp 65001 >nul
title AI Novel Studio - Installer

echo ========================================
echo   AI Novel Studio v0.1.0 - Installer
echo ========================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Please right-click and select "Run as administrator".
    pause
    exit /b 1
)

where node >nul 2>&1
if %errorLevel% neq 0 (
    echo Node.js not found. Please install Node.js 18+: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do echo Node.js: %%i
echo.

set "INSTALL_DIR=%LOCALAPPDATA%\AI-Novel-Studio"
set "SOURCE_DIR=%~dp0"

if not exist "%SOURCE_DIR%server\main.js" (
    echo [ERROR] Source files not found.
    echo Please run build.bat first, then run install.bat from dist/.
    pause
    exit /b 1
)

echo Installing to: %INSTALL_DIR%
echo.

echo [1/5] Creating directories...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%INSTALL_DIR%\data" mkdir "%INSTALL_DIR%\data"
if not exist "%INSTALL_DIR%\data\uploads" mkdir "%INSTALL_DIR%\data\uploads"
if not exist "%INSTALL_DIR%\data\backups" mkdir "%INSTALL_DIR%\data\backups"
echo   OK

echo [2/5] Copying files...
xcopy /E /I /Y "%SOURCE_DIR%server" "%INSTALL_DIR%\server\" >nul 2>&1
xcopy /E /I /Y "%SOURCE_DIR%web" "%INSTALL_DIR%\web\" >nul 2>&1
xcopy /E /I /Y "%SOURCE_DIR%prisma" "%INSTALL_DIR%\prisma\" >nul 2>&1
copy /Y "%SOURCE_DIR%start.bat" "%INSTALL_DIR%\" >nul 2>&1
copy /Y "%SOURCE_DIR%stop.bat" "%INSTALL_DIR%\" >nul 2>&1
echo   OK

echo [3/5] Installing dependencies...
cd /d "%INSTALL_DIR%"
echo { > package.json
echo   "name": "ai-novel-studio", >> package.json
echo   "version": "0.1.0", >> package.json
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
call npm install --production --legacy-peer-deps 2>nul
if %errorLevel% neq 0 call npm install --production

echo   Generating Prisma client...
if exist "prisma\schema.prisma" if exist "node_modules\prisma\build\index.js" node node_modules\prisma\build\index.js generate --schema=prisma\schema.prisma
echo   OK

echo   Copying workspace packages...
mkdir "%INSTALL_DIR%\node_modules\@ai-novel" 2>nul
xcopy /E /I /Y "%SOURCE_DIR%node_modules\@ai-novel" "%INSTALL_DIR%\node_modules\@ai-novel\" >nul 2>&1
echo   OK

echo [4/5] Generating config...
node -e "require(""crypto"").randomBytes(48).toString(""hex"")" > _jwt.tmp
set /p JWT=<_jwt.tmp 2>nul
del _jwt.tmp 2>nul
echo # AI Novel Studio - Env Config > .env
echo APP_MODE=local >> .env
echo PORT=18765 >> .env
echo DATABASE_URL=file:./data/novel.db >> .env
echo STORAGE_DRIVER=local >> .env
echo STORAGE_LOCAL_PATH=./data/uploads >> .env
echo QUEUE_DRIVER=sqlite >> .env
echo AUTH_MODE=local >> .env
echo JWT_SECRET=%JWT% >> .env
echo JWT_EXPIRES_IN=7d >> .env
echo APP_SECRET=%JWT% >> .env
echo KNOWLEDGE_PATH=./knowledge >> .env
echo KNOWLEDGE_RETRIEVAL_MODE=fts >> .env
echo LOG_LEVEL=info >> .env
echo   OK

echo [5/5] Initializing database...
if exist "node_modules\.bin\prisma.cmd" (
    call node node_modules\prisma\build\index.js db push --schema=prisma/schema.prisma --skip-generate 2>nul
    echo   Database initialized.
)
echo   OK

echo.
echo ========================================
echo   Installation complete!
echo ========================================
echo.
echo Creating shortcuts...

mshta "javascript:var sh=new ActiveXObject('WScript.Shell');var lnk=sh.CreateShortcut('%USERPROFILE%\Desktop\AI Novel Studio.lnk');lnk.TargetPath='%INSTALL_DIR%\start.bat';lnk.WorkingDirectory='%INSTALL_DIR%';lnk.Description='AI Novel Studio v0.1.0';lnk.Save();close();"
echo   Desktop shortcut created.

set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs"
if not exist "%START_MENU%\AI Novel Studio" mkdir "%START_MENU%\AI Novel Studio"
copy /Y "%INSTALL_DIR%\start.bat" "%START_MENU%\AI Novel Studio\Start.bat" >nul
copy /Y "%INSTALL_DIR%\stop.bat" "%START_MENU%\AI Novel Studio\Stop.bat" >nul
echo   Start Menu items created.

echo.
echo Installed: %INSTALL_DIR%
echo.
echo To start: double-click desktop "AI Novel Studio" shortcut.
echo.
pause
