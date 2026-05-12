@echo off
chcp 65001 >nul
title AI Novel Studio - 一键部署
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   AI小说创作系统 v1.4.8 - 一键构建部署                    ║
echo ║   输出: Win10可直接运行的便携版 + 安装包                   ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

set "ROOT_DIR=%~dp0..\.."
cd /d "%ROOT_DIR%"

rem ============================================
rem Step 1: 构建项目
rem ============================================
echo [1/4] 构建项目...
echo   - 安装依赖...
call pnpm install
if %errorLevel% neq 0 (
    echo [ERROR] pnpm install 失败，请确保已安装 pnpm
    echo   安装: npm install -g pnpm
    pause & exit /b 1
)

echo   - 构建所有包...
call pnpm build
if %errorLevel% neq 0 (
    echo [ERROR] 构建失败
    pause & exit /b 1
)

echo   - 生成Prisma客户端...
call pnpm db:generate
echo   构建完成
echo.

rem ============================================
rem Step 2: 执行build.bat创建dist
rem ============================================
echo [2/4] 打包发布文件...
call "%~dp0build.bat"
if %errorLevel% neq 0 (
    echo [ERROR] 打包失败
    pause & exit /b 1
)
echo   打包完成
echo.

rem ============================================
rem Step 3: 创建便携版（内嵌Node.js）
rem ============================================
echo [3/4] 创建Win10便携版...
set "EXE_DIR=%ROOT_DIR%\dist-exe"

if exist "%EXE_DIR%" rmdir /S /Q "%EXE_DIR%"
mkdir "%EXE_DIR%"

rem 复制所有发布文件
echo   - 复制发布文件...
xcopy /E /I /Y "%ROOT_DIR%\dist\*" "%EXE_DIR%\" >nul 2>nul

rem 内嵌Node.js运行时
echo   - 内嵌Node.js运行时...
set "NODE_DIR=%EXE_DIR%\node"
if not exist "%NODE_DIR%\node.exe" (
    mkdir "%NODE_DIR%" 2>nul
    
    rem 尝试从本机复制Node.js
    echo     尝试复制本机Node.js...
    set "LOCAL_NODE="
    for /f "delims=" %%i in ('where node 2^>nul') do set "LOCAL_NODE=%%i"
    
    if defined LOCAL_NODE (
        for %%i in ("!LOCAL_NODE!") do set "NODE_BIN_DIR=%%~dpi"
        echo     Node.js路径: !NODE_BIN_DIR!
        xcopy /E /I /Y "!NODE_BIN_DIR!\*" "%NODE_DIR%\" >nul 2>nul
    )
    
    if not exist "%NODE_DIR%\node.exe" (
        echo     本机Node.js复制失败，下载Node.js v20.11.0...
        set "NODE_ZIP=%TEMP%\node-v20.11.0-win-x64.zip"
        if not exist "!NODE_ZIP!" (
            echo     下载中...
            curl -L -o "!NODE_ZIP!" "https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip" 2>nul
            if !errorLevel! neq 0 (
                powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip' -OutFile '!NODE_ZIP!'" 2>nul
            )
        )
        if exist "!NODE_ZIP!" (
            echo     解压...
            powershell -Command "Expand-Archive -Path '!NODE_ZIP!' -DestinationPath '%TEMP%\node-tmp' -Force" 2>nul
            if exist "%TEMP%\node-tmp\node-v20.11.0-win-x64" (
                xcopy /E /I /Y "%TEMP%\node-tmp\node-v20.11.0-win-x64\*" "%NODE_DIR%\" >nul 2>nul
            )
            rmdir /S /Q "%TEMP%\node-tmp" 2>nul
        )
    )
)

if exist "%NODE_DIR%\node.exe" (
    echo   - Node.js内嵌成功
) else (
    echo   - [WARN] Node.js内嵌失败，将使用系统Node.js
)

rem 创建一键启动脚本
echo   - 创建启动脚本...

rem 主启动脚本 - 使用内嵌Node.js
(
echo @echo off
echo chcp 65001 ^>nul
echo title AI小说创作系统
echo setlocal enabledelayedexpansion
echo.
echo set "APP_DIR=%%~dp0"
echo cd /d "!APP_DIR!"
echo.
echo rem 使用内嵌Node.js（优先）或系统Node.js
echo if exist "!APP_DIR!\node\node.exe" ^(
echo   set "PATH=!APP_DIR!\node;!PATH!"
echo ^) else ^(
echo   echo [WARN] 未找到内嵌Node.js，使用系统Node.js
echo   echo   如启动失败，请安装Node.js v20+: https://nodejs.org/
echo ^)
echo set "NODE_PATH=!APP_DIR!\node_modules"
echo.
echo rem ===== 首次运行初始化 =====
echo if not exist ".env" ^(
echo   echo.
echo   echo   [首次运行] 正在初始化...
echo   echo.
echo   rem 生成安全配置
echo   node -e "const fs=require('fs'^);const c=require('crypto'^).randomBytes(48^).toString('hex'^);fs.writeFileSync('.env','APP_MODE=local\nPORT=18765\nDATABASE_URL=file:./data/novel.db\nSTORAGE_DRIVER=local\nSTORAGE_LOCAL_PATH=./data/uploads\nQUEUE_DRIVER=sqlite\nAUTH_MODE=local\nJWT_SECRET='+c+'\nJWT_EXPIRES_IN=7d\nAPP_SECRET='+c+'\nKNOWLEDGE_PATH=./knowledge\nKNOWLEDGE_RETRIEVAL_MODE=fts\nLOG_LEVEL=info'^)" 2^>nul
echo   if %%errorLevel%% neq 0 ^(
echo     echo   [ERROR] 配置生成失败
echo     pause ^& exit /b 1
echo   ^)
echo   echo   - 配置文件已生成
echo ^)
echo.
echo rem 初始化数据库
echo if not exist "data\novel.db" ^(
echo   if exist "node_modules\prisma\build\index.js" ^(
echo     echo   - 初始化数据库...
echo     node node_modules\prisma\build\index.js db push --accept-data-loss --schema=prisma\schema.prisma --skip-generate ^>nul 2^>^&1
echo     node node_modules\prisma\build\index.js generate --schema=prisma\schema.prisma ^>nul 2^>^&1
echo     echo   - 数据库已初始化
echo   ^)
echo ^)
echo.
echo rem ===== 启动服务 =====
echo echo.
echo echo ══════════════════════════════════════════════════════
echo echo   AI小说创作系统 v1.4.8
echo echo ══════════════════════════════════════════════════════
echo echo.
echo echo   启动中... 请稍候
echo echo   首次启动约需8秒
echo echo.
echo.
echo rem 打开浏览器
echo start "" "http://127.0.0.1:18765"
echo.
echo rem 启动后端
echo node server/main.js
echo.
echo echo.
echo echo 服务已停止。
echo pause
) > "%EXE_DIR%\启动.bat"

rem 停止脚本
(
echo @echo off
echo echo 正在停止服务...
echo for /f "tokens=5" %%%%a in ^('netstat -aon ^| findstr ":18765 " ^| findstr "LISTENING"'^) do taskkill /PID %%%%a /F 2^>nul
echo echo 服务已停止
) > "%EXE_DIR%\停止.bat"

rem 创建桌面快捷方式
(
echo @echo off
echo set "APP_DIR=%%~dp0"
echo powershell -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop'^) + '\AI小说创作系统.lnk'^); $sc.TargetPath = '%%APP_DIR%%启动.bat'; $sc.WorkingDirectory = '%%APP_DIR%%'; $sc.Description = 'AI小说工业化创作平台'; $sc.Save()"
echo echo 桌面快捷方式已创建
) > "%EXE_DIR%\创建桌面快捷方式.bat"

rem 创建README
(
echo AI小说创作系统 v1.4.8 - 便携版
echo ===================================
echo.
echo 使用方法:
echo   1. 双击 "启动.bat" 启动服务
echo   2. 等待约8秒，浏览器自动打开
echo   3. 访问地址: http://127.0.0.1:18765
echo   4. 双击 "停止.bat" 停止服务
echo.
echo 首次运行:
echo   - 自动生成安全配置
echo   - 自动初始化数据库
echo   - 默认账号: admin / admin123
echo.
echo 系统要求:
echo   - Windows 10/11 64位
echo   - 内嵌Node.js v20.11.0（已包含）
echo   - 约500MB磁盘空间
echo.
echo 如需创建桌面快捷方式:
echo   双击 "创建桌面快捷方式.bat"
) > "%EXE_DIR%\README.txt"

echo   便携版创建完成
echo.

rem ============================================
rem Step 4: 尝试创建Inno Setup安装包
rem ============================================
echo [4/4] 创建安装包...
where iscc >nul 2>nul
if %errorLevel% equ 0 (
    echo   使用Inno Setup编译安装包...
    iscc "%~dp0installer.iss" 2>nul
    if %errorLevel% equ 0 (
        echo   安装包创建成功: dist-installer\
    ) else (
        echo   [SKIP] Inno Setup编译失败，仅提供便携版
    )
) else (
    echo   [SKIP] 未安装Inno Setup，仅提供便携版
    echo   如需安装包: 下载 https://jrsoftware.org/isdl.php 并安装
)
echo.

rem ============================================
rem 完成
rem ============================================
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   构建完成!                                               ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo   便携版: %EXE_DIR%
echo     └─ 启动.bat     (双击运行)
echo     └─ 停止.bat     (停止服务)
echo     └─ node\        (内嵌Node.js运行时)
echo.
echo   使用方式:
echo     1. 将 dist-exe 文件夹复制到目标电脑
echo     2. 双击 "启动.bat"
echo     3. 浏览器自动打开 http://127.0.0.1:18765
echo.
echo   默认登录: admin / admin123
echo.
pause
