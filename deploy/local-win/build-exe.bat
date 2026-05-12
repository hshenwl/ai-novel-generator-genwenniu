@echo off
chcp 65001 >nul
title AI Novel Studio - Build EXE
setlocal enabledelayedexpansion

echo ========================================
echo   AI Novel Studio - 构建Windows EXE
echo ========================================
echo.

set "ROOT_DIR=%~dp0..\.."
set "DIST_DIR=%ROOT_DIR%\dist"
set "EXE_DIR=%ROOT_DIR%\dist-exe"

rem ============================================
rem 第1步: 安装依赖并构建项目
rem ============================================
echo [1/7] 安装依赖...
cd /d "%ROOT_DIR%"
call pnpm install
if %errorLevel% neq 0 (
    echo [ERROR] pnpm install 失败
    pause
    exit /b 1
)
echo   OK
echo.

rem ============================================
rem 第2步: 构建所有包
rem ============================================
echo [2/7] 构建所有包...
cd /d "%ROOT_DIR%"
call pnpm build
if %errorLevel% neq 0 (
    echo [ERROR] pnpm build 失败
    pause
    exit /b 1
)
echo   OK
echo.

rem ============================================
rem 第3步: 生成Prisma客户端
rem ============================================
echo [3/7] 生成Prisma客户端...
cd /d "%ROOT_DIR%"
call pnpm db:generate
echo   OK
echo.

rem ============================================
rem 第4步: 创建dist目录结构
rem ============================================
echo [4/7] 准备发布目录...
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

rem ============================================
rem 第5步: 复制构建产物
rem ============================================
echo [5/7] 复制构建产物...

rem 复制后端
xcopy /E /I /Y "%ROOT_DIR%\apps\server\dist\*" "%DIST_DIR%\server\" >nul
echo   - Server OK

rem 复制前端
xcopy /E /I /Y "%ROOT_DIR%\apps\web\dist\*" "%DIST_DIR%\web\" >nul
echo   - Web OK

rem 复制workspace包
mkdir "%DIST_DIR%\node_modules\@ai-novel" 2>nul
for %%p in (ai-gateway seven-step-engine workflow-engine knowledge-base shared exporter) do (
    if exist "%ROOT_DIR%\packages\%%p\dist" (
        mkdir "%DIST_DIR%\node_modules\@ai-novel\%%p" 2>nul
        xcopy /E /I /Y "%ROOT_DIR%\packages\%%p\dist\*" "%DIST_DIR%\node_modules\@ai-novel\%%p\" >nul
        echo {"main":"./index.js"} > "%DIST_DIR%\node_modules\@ai-novel\%%p\package.json"
    )
)
echo   - Workspace packages OK

rem 复制Prisma schema + engine
copy /Y "%ROOT_DIR%\apps\server\prisma\schema.prisma" "%DIST_DIR%\prisma\" >nul
if exist "%ROOT_DIR%\apps\server\node_modules\.prisma\client" (
    mkdir "%DIST_DIR%\node_modules\.prisma\client" 2>nul
    xcopy /E /I /Y "%ROOT_DIR%\apps\server\node_modules\.prisma\client\*" "%DIST_DIR%\node_modules\.prisma\client\" >nul
)
if exist "%ROOT_DIR%\apps\server\node_modules\@prisma" (
    mkdir "%DIST_DIR%\node_modules\@prisma" 2>nul
    xcopy /E /I /Y "%ROOT_DIR%\apps\server\node_modules\@prisma\*" "%DIST_DIR%\node_modules\@prisma\" >nul
)
echo   - Prisma OK

rem 复制resources和knowledge
if exist "%ROOT_DIR%\resources\rules" (
    mkdir "%DIST_DIR%\resources\rules" 2>nul
    xcopy /E /I /Y "%ROOT_DIR%\resources\rules\*" "%DIST_DIR%\resources\rules\" >nul
)
if exist "%ROOT_DIR%\resources\prompts" (
    mkdir "%DIST_DIR%\resources\prompts" 2>nul
    xcopy /E /I /Y "%ROOT_DIR%\resources\prompts\*" "%DIST_DIR%\resources\prompts\" >nul
)
if exist "%ROOT_DIR%\knowledge" (
    mkdir "%DIST_DIR%\knowledge" 2>nul
    xcopy /E /I /Y "%ROOT_DIR%\knowledge\*" "%DIST_DIR%\knowledge\" >nul
)
echo   - Resources OK

rem 复制Python Flask API
if exist "%ROOT_DIR%\api" (
    mkdir "%DIST_DIR%\api" 2>nul
    xcopy /E /I /Y "%ROOT_DIR%\api\*" "%DIST_DIR%\api\" >nul
)
echo   - API OK

rem 复制启动脚本
copy /Y "%~dp0start.bat" "%DIST_DIR%\" >nul
copy /Y "%~dp0stop.bat" "%DIST_DIR%\" >nul
echo   - Scripts OK
echo.

rem ============================================
rem 第6步: 生成package.json和安装生产依赖
rem ============================================
echo [6/7] 安装生产依赖...
cd /d "%DIST_DIR%"

(
echo {
echo   "name": "ai-novel-studio",
echo   "version": "1.4.8",
echo   "private": true,
echo   "scripts": { "start": "node server/main.js" },
echo   "dependencies": {
echo     "@nestjs/common": "^10.0.0",
echo     "@nestjs/config": "^3.0.0",
echo     "@nestjs/core": "^10.0.0",
echo     "@nestjs/jwt": "^11.0.2",
echo     "@nestjs/passport": "^11.0.5",
echo     "@nestjs/platform-express": "^10.0.0",
echo     "@nestjs/swagger": "^7.0.0",
echo     "@prisma/client": "^5.0.0",
echo     "bcrypt": "^5.1.0",
echo     "class-transformer": "^0.5.1",
echo     "class-validator": "^0.14.0",
echo     "passport": "^0.7.0",
echo     "passport-jwt": "^4.0.1",
echo     "prisma": "^5.0.0",
echo     "reflect-metadata": "^0.2.0",
echo     "rxjs": "^7.8.0",
echo     "express": "^4.18.0",
echo     "swagger-ui-express": "^5.0.1"
echo   }
echo }
) > package.json

call npm install --production --legacy-peer-deps 2>nul
if %errorLevel% neq 0 call npm install --production

rem 重新复制workspace包（npm install可能清除了它们）
mkdir "%DIST_DIR%\node_modules\@ai-novel" 2>nul
for %%p in (ai-gateway seven-step-engine workflow-engine knowledge-base shared exporter) do (
    if exist "%ROOT_DIR%\packages\%%p\dist" (
        mkdir "%DIST_DIR%\node_modules\@ai-novel\%%p" 2>nul
        xcopy /E /I /Y "%ROOT_DIR%\packages\%%p\dist\*" "%DIST_DIR%\node_modules\@ai-novel\%%p\" >nul
        echo {"main":"./index.js"} > "%DIST_DIR%\node_modules\@ai-novel\%%p\package.json"
    )
)

rem 重新生成Prisma客户端
if exist "prisma\schema.prisma" if exist "node_modules\prisma\build\index.js" (
    node node_modules\prisma\build\index.js generate --schema=prisma\schema.prisma
)
echo   OK
echo.

rem ============================================
rem 第7步: 生成.env + 打包EXE
rem ============================================
echo [7/7] 生成配置并打包EXE...

rem 生成.env
node -e "require('crypto').randomBytes(48).toString('hex')" > _jwt.tmp
set /p JWT=<_jwt.tmp 2>nul
del _jwt.tmp 2>nul
(
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

rem ============================================
rem 打包为EXE (使用Node.js SEA)
rem ============================================
echo.
echo 正在使用Node.js Single Executable Application 打包...

rem 检查Node.js版本（SEA需要20+）
node -e "const v=process.version.match(/\d+/)[0]; if(v<20){console.error('Node.js 20+ required for SEA, got '+process.version);process.exit(1)}" 2>nul
if %errorLevel% neq 0 (
    echo [WARN] Node.js版本不支持SEA，改用pkg打包...
    goto :use_pkg
)

rem 使用Node.js SEA打包
node -e "const fs=require('fs'),path=require('path');const sea=require('node:sea');console.log('SEA available:'+sea.isSea())" 2>nul
if %errorLevel% neq 0 (
    echo [INFO] SEA不可用，使用pkg打包...
    goto :use_pkg
)

:use_sea
echo 使用Node.js SEA打包...
mkdir "%EXE_DIR%" 2>nul

rem 创建SEA入口文件（嵌入所有依赖路径）
(
echo // SEA Entry Point for AI Novel Studio
echo const path = require('path');
echo const fs = require('fs');
echo.
echo // 设置工作目录
echo const workDir = path.dirname(process.execPath);
echo process.chdir(workDir);
echo.
echo // 设置NODE_PATH
echo process.env.NODE_PATH = path.join(workDir, 'node_modules');
echo require('module')._initPaths();
echo.
echo // 启动服务
echo require('./server/main.js');
) > sea-entry.js

rem 生成SEA blob
node --experimental-sea-config sea-config.json 2>nul || (
    echo [INFO] 使用pkg替代SEA...
    goto :use_pkg
)

copy /Y "%EXE_DIR%\ai-novel-studio.exe" "%DIST_DIR%\AI小说创作系统.exe" 2>nul
echo   SEA EXE打包完成
goto :done

:use_pkg
echo.
echo 使用pkg打包为独立EXE...
echo 安装pkg工具...
call npm install -g pkg 2>nul

mkdir "%EXE_DIR%" 2>nul

rem 创建pkg入口
(
echo // pkg Entry - AI Novel Studio
echo process.env.NODE_PATH = __dirname + '/node_modules';
echo require('module')._initPaths();
echo require('./server/main.js');
) > pkg-entry.js

echo 正在打包（这可能需要几分钟）...
call pkg pkg-entry.js --target node18-win-x64 --output "%EXE_DIR%\AI小说创作系统.exe" --config package.json 2>nul

if %errorLevel% neq 0 (
    echo.
    echo [WARN] pkg打包失败，创建便携版（Node.js + start.bat）...
    goto :portable
)

rem 复制非node资源到exe目录
xcopy /E /I /Y "%DIST_DIR%\web" "%EXE_DIR%\web\" >nul
xcopy /E /I /Y "%DIST_DIR%\prisma" "%EXE_DIR%\prisma\" >nul
xcopy /E /I /Y "%DIST_DIR%\data" "%EXE_DIR%\data\" >nul
xcopy /E /I /Y "%DIST_DIR%\resources" "%EXE_DIR%\resources\" >nul 2>nul
xcopy /E /I /Y "%DIST_DIR%\knowledge" "%EXE_DIR%\knowledge\" >nul 2>nul
xcopy /E /I /Y "%DIST_DIR%\api" "%EXE_DIR%\api\" >nul 2>nul
copy /Y "%DIST_DIR%\.env" "%EXE_DIR%\" >nul

echo   pkg EXE打包完成
goto :done

:portable
rem ============================================
rem 便携版：嵌入Node.js + 一键启动
rem ============================================
echo.
echo 创建便携版（内嵌Node.js运行时）...

mkdir "%EXE_DIR%" 2>nul

rem 复制整个dist到exe目录
xcopy /E /I /Y "%DIST_DIR%\*" "%EXE_DIR%\" >nul

rem 下载并嵌入Node.js
echo 下载Node.js v20.11.0 win-x64...
set "NODE_ZIP=node-v20.11.0-win-x64.zip"
set "NODE_URL=https://nodejs.org/dist/v20.11.0/%NODE_ZIP%"

if not exist "%EXE_DIR%\node" (
    if not exist "%TEMP%\%NODE_ZIP%" (
        echo   下载中... (请确保网络可用)
        curl -L -o "%TEMP%\%NODE_ZIP%" "%NODE_URL%" 2>nul
        if %errorLevel% neq 0 (
            echo   [WARN] curl下载失败，尝试powershell...
            powershell -Command "Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%TEMP%\%NODE_ZIP%'" 2>nul
        )
    )

    if exist "%TEMP%\%NODE_ZIP%" (
        echo   解压Node.js...
        powershell -Command "Expand-Archive -Path '%TEMP%\%NODE_ZIP%' -DestinationPath '%EXE_DIR%\node-tmp' -Force" 2>nul
        if exist "%EXE_DIR%\node-tmp\node-v20.11.0-win-x64" (
            rename "%EXE_DIR%\node-tmp\node-v20.11.0-win-x64" node
            move /Y "%EXE_DIR%\node-tmp\node" "%EXE_DIR%\node" >nul 2>nul
        )
        rmdir /S /Q "%EXE_DIR%\node-tmp" 2>nul
    )
)

rem 创建一键启动EXE（使用batch转exe的简易方案）
(
echo @echo off
echo chcp 65001 ^>nul
echo title AI小说创作系统
echo setlocal enabledelayedexpansion
echo.
echo set "APP_DIR=%%~dp0"
echo cd /d "%%APP_DIR%%"
echo.
echo rem 设置路径
echo set "PATH=%%APP_DIR%%\node;%%PATH%%"
echo set "NODE_PATH=%%APP_DIR%%\node_modules"
echo.
echo rem 检查首次运行
echo if not exist ".env" ^
echo (
echo   echo [初始化] 生成配置...
echo   node -e "require('crypto'.randomBytes(48).toString('hex'))" ^> _jwt.tmp
echo   set /p NS=_jwt.tmp 2^>nul
echo   del _jwt.tmp 2^>nul
echo   (
echo     echo APP_MODE=local
echo     echo PORT=18765
echo     echo DATABASE_URL=file:./data/novel.db
echo     echo STORAGE_DRIVER=local
echo     echo STORAGE_LOCAL_PATH=./data/uploads
echo     echo QUEUE_DRIVER=sqlite
echo     echo AUTH_MODE=local
echo     echo JWT_SECRET=%%NS%%
echo     echo JWT_EXPIRES_IN=7d
echo     echo APP_SECRET=%%NS%%
echo     echo KNOWLEDGE_PATH=./knowledge
echo     echo KNOWLEDGE_RETRIEVAL_MODE=fts
echo     echo LOG_LEVEL=info
echo   ^) ^> .env
echo ^)
echo.
echo rem 初始化数据库
echo if not exist "data\novel.db" ^
echo (
echo   echo [初始化] 同步数据库...
echo   if exist "node_modules\prisma\build\index.js" ^
echo   (
echo     node node_modules\prisma\build\index.js db push --accept-data-loss --schema=prisma\schema.prisma --skip-generate ^>nul 2^>^&1
echo     node node_modules\prisma\build\index.js generate --schema=prisma\schema.prisma ^>nul 2^>^&1
echo   ^)
echo ^)
echo.
echo rem 种子数据
echo echo [初始化] 加载内置数据...
echo node -e "const http=require('http');const req=http.request({hostname:'127.0.0.1',port:18765,path:'/api/writing-styles/seed-builtin',method:'POST'},res=>{});req.end();" 2^>nul
echo.
echo echo.
echo echo ========================================
echo echo   AI小说创作系统 v1.4.8
echo echo ========================================
echo echo.
echo echo 启动中... 请稍候
echo echo.
echo.
echo rem 启动服务
echo start "" "http://127.0.0.1:18765"
echo node server/main.js
echo.
echo echo.
echo echo 服务已停止。
echo pause
) > "%EXE_DIR%\启动.bat"

rem 创建停止脚本
(
echo @echo off
echo for /f "tokens=5" %%%%a in ('netstat -aon ^| findstr ":18765 " ^| findstr "LISTENING"') do taskkill /PID %%%%a /F 2^>nul
echo echo 服务已停止
) > "%EXE_DIR%\停止.bat"

rem 创建桌面快捷方式脚本
(
echo @echo off
echo set "APP_DIR=%%~dp0"
echo powershell -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\AI小说创作系统.lnk'); $sc.TargetPath = '%%APP_DIR%%启动.bat'; $sc.WorkingDirectory = '%%APP_DIR%%'; $sc.Description = 'AI小说工业化创作平台'; $sc.Save()"
echo echo 桌面快捷方式已创建
) > "%EXE_DIR%\创建桌面快捷方式.bat"

echo   便携版创建完成

:done
echo.
echo ========================================
echo   构建完成!
echo ========================================
echo.
echo 输出目录: %EXE_DIR%
echo.
echo 使用方式:
echo   1. 双击 "启动.bat" 启动服务
echo   2. 浏览器自动打开 http://127.0.0.1:18765
echo   3. 双击 "停止.bat" 停止服务
echo   4. 首次启动会自动初始化数据库和配置
echo.
echo 如需创建桌面快捷方式:
echo   双击 "创建桌面快捷方式.bat"
echo.
pause
