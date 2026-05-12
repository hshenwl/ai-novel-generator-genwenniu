@echo off
chcp 65001 >nul
echo ========================================
echo   AI小说创作系统 - 安装向导
echo ========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 请以管理员身份运行此脚本！
    pause
    exit /b 1
)

:: 设置安装目录
set "INSTALL_DIR=%LOCALAPPDATA%\AI-Novel-Studio"
set "DESKTOP_DIR=%USERPROFILE%\Desktop"

echo 安装目录: %INSTALL_DIR%
echo.

:: 创建安装目录
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%INSTALL_DIR%\data" mkdir "%INSTALL_DIR%\data"
if not exist "%INSTALL_DIR%\uploads" mkdir "%INSTALL_DIR%\uploads"
if not exist "%INSTALL_DIR%\backups" mkdir "%INSTALL_DIR%\backups"

:: 复制程序文件
echo [1/4] 复制程序文件...
xcopy /E /I /Y "apps\server\dist" "%INSTALL_DIR%\server\dist"
xcopy /E /I /Y "apps\web\dist" "%INSTALL_DIR%\web\dist"
xcopy /E /I /Y "node_modules" "%INSTALL_DIR%\node_modules"
copy /Y "package.json" "%INSTALL_DIR%\"
echo 完成！

:: 创建启动脚本
echo [2/4] 创建启动脚本...
(
echo @echo off
echo chcp 65001 ^>nul
echo cd /d "%INSTALL_DIR%"
echo start "" "http://127.0.0.1:18765"
echo node server/dist/main.js
) > "%INSTALL_DIR%\start.bat"
echo 完成！

:: 创建桌面快捷方式
echo [3/4] 创建桌面快捷方式...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP_DIR%\AI小说创作系统.lnk'); $s.TargetPath = '%INSTALL_DIR%\start.bat'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Description = 'AI小说创作系统'; $s.Save()"
echo 完成！

:: 创建开始菜单项
echo [4/4] 创建开始菜单项...
set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs"
if not exist "%START_MENU%\AI小说创作系统" mkdir "%START_MENU%\AI小说创作系统"
copy /Y "%INSTALL_DIR%\start.bat" "%START_MENU%\AI小说创作系统\启动服务.bat"
echo 完成！

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 安装位置: %INSTALL_DIR%
echo.
echo 使用方法:
echo   1. 双击桌面上的"AI小说创作系统"图标
echo   2. 或从开始菜单启动
echo   3. 浏览器将自动打开 http://127.0.0.1:18765
echo.
echo 首次启动可能需要几秒钟初始化数据库...
echo.

pause