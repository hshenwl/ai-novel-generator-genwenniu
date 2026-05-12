// ============================================================
// Node.js SEA (Single Executable Application) 打包脚本
// 将AI Novel Studio打包为独立的Windows EXE
// 使用: node build-sea.js
// ============================================================

const { execSync, existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } = require('fs');
const { join, resolve, dirname } = require('path');

const ROOT = resolve(__dirname, '..', '..');
const DIST = join(ROOT, 'dist');
const EXE_DIR = join(ROOT, 'dist-exe');

console.log('========================================');
console.log('  AI Novel Studio - SEA EXE Builder');
console.log('========================================\n');

// Step 1: 先执行build.bat
console.log('[1/5] 执行构建...');
try {
  execSync('call "' + join(__dirname, 'build.bat') + '"', {
    cwd: ROOT,
    stdio: 'inherit',
    shell: 'cmd.exe',
  });
} catch (e) {
  console.error('[ERROR] 构建失败:', e.message);
  process.exit(1);
}

// Step 2: 创建SEA入口
console.log('\n[2/5] 创建SEA入口...');
const seaEntry = `// AI Novel Studio - SEA Entry
const path = require('path');
const fs = require('fs');

// 设置工作目录为EXE所在目录
const exeDir = path.dirname(process.execPath);
process.chdir(exeDir);

// 设置NODE_PATH
const nodeModulesPath = path.join(exeDir, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  process.env.NODE_PATH = nodeModulesPath;
  require('module')._initPaths();
}

// 启动NestJS服务
console.log('Starting AI Novel Studio...');
require(path.join(exeDir, 'server', 'main.js'));
`;
writeFileSync(join(DIST, 'sea-entry.js'), seaEntry);

// Step 3: 创建SEA配置
console.log('[3/5] 创建SEA配置...');
const seaConfig = {
  main: join(DIST, 'sea-entry.js'),
  output: join(DIST, 'sea-prep.blob'),
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: true,
};
writeFileSync(join(DIST, 'sea-config.json'), JSON.stringify(seaConfig, null, 2));

// Step 4: 生成blob
console.log('[4/5] 生成SEA blob...');
try {
  execSync(`node --experimental-sea-config "${join(DIST, 'sea-config.json')}"`, {
    cwd: DIST,
    stdio: 'inherit',
  });
} catch (e) {
  console.error('[ERROR] SEA blob生成失败。请确保Node.js >= 20.0.0');
  console.error('回退到便携版方案...');
  createPortableVersion();
  process.exit(0);
}

// Step 5: 复制node.exe并注入blob
console.log('[5/5] 生成EXE...');
mkdirSync(EXE_DIR, { recursive: true });

const nodeExePath = process.execPath;
const targetExe = join(EXE_DIR, 'AI小说创作系统.exe');

copyFileSync(nodeExePath, targetExe);

// 移除签名（Windows需要）
try {
  execSync(`signtool remove /s "${targetExe}"`, { stdio: 'ignore' });
} catch {
  // signtool不可用，尝试其他方式
}

// 注入SEA blob
try {
  execSync(`npx postject "${targetExe}" NODE_SEA_BLOB "${join(DIST, 'sea-prep.blob')}" --sentinel-node-sea-blob`, {
    cwd: DIST,
    stdio: 'inherit',
  });
} catch (e) {
  console.error('[ERROR] blob注入失败:', e.message);
  console.error('请手动安装postject: npm install -g postject');
  createPortableVersion();
  process.exit(0);
}

// 复制非嵌入资源
copyNonEmbeddedResources();

console.log('\n========================================');
console.log('  SEA EXE 构建成功!');
console.log('========================================');
console.log(`\n输出: ${targetExe}`);
console.log('\n使用: 双击 AI小说创作系统.exe 启动');

function copyNonEmbeddedResources() {
  const dirs = ['web', 'prisma', 'data', 'resources', 'knowledge', 'api'];
  for (const dir of dirs) {
    const src = join(DIST, dir);
    const dst = join(EXE_DIR, dir);
    if (existsSync(src)) {
      try {
        execSync(`xcopy /E /I /Y "${src}\\*" "${dst}\\"`, { stdio: 'ignore' });
      } catch {}
    }
  }
  // 复制.env
  const envSrc = join(DIST, '.env');
  if (existsSync(envSrc)) {
    copyFileSync(envSrc, join(EXE_DIR, '.env'));
  }
  // 复制node_modules (SEA不能嵌入native模块)
  const nmSrc = join(DIST, 'node_modules');
  if (existsSync(nmSrc)) {
    try {
      execSync(`xcopy /E /I /Y "${nmSrc}\\*" "${join(EXE_DIR, 'node_modules')}\\"`, { stdio: 'ignore' });
    } catch {}
  }
  // 创建启动辅助脚本
  writeFileSync(join(EXE_DIR, '启动.bat'), `@echo off
chcp 65001 >nul
title AI小说创作系统
cd /d "%~dp0"
if not exist ".env" (
  echo [首次运行] 生成配置...
  node -e "const fs=require('fs');const c=require('crypto').randomBytes(48).toString('hex');fs.writeFileSync('.env','APP_MODE=local\\nPORT=18765\\nDATABASE_URL=file:./data/novel.db\\nSTORAGE_DRIVER=local\\nSTORAGE_LOCAL_PATH=./data/uploads\\nQUEUE_DRIVER=sqlite\\nAUTH_MODE=local\\nJWT_SECRET='+c+'\\nJWT_EXPIRES_IN=7d\\nAPP_SECRET='+c+'\\nKNOWLEDGE_PATH=./knowledge\\nKNOWLEDGE_RETRIEVAL_MODE=fts\\nLOG_LEVEL=info')"
)
start "" "http://127.0.0.1:18765"
"AI小说创作系统.exe"
pause
`);
}

function createPortableVersion() {
  console.log('\n创建便携版（内嵌Node.js + 一键启动）...');
  mkdirSync(EXE_DIR, { recursive: true });

  // 复制整个dist
  try {
    execSync(`xcopy /E /I /Y "${DIST}\\*" "${EXE_DIR}\\"`, { stdio: 'ignore' });
  } catch {}

  // 创建启动脚本（自动下载Node.js如果不存在）
  writeFileSync(join(EXE_DIR, '启动.bat'), `@echo off
chcp 65001 >nul
title AI小说创作系统
setlocal enabledelayedexpansion
set "APP_DIR=%~dp0"
cd /d "!APP_DIR!"

rem 检查内嵌Node.js
if not exist "node\\node.exe" (
  echo [首次运行] 下载Node.js运行时...
  mkdir node 2>nul
  powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip' -OutFile '%TEMP%\\node.zip'"
  powershell -Command "Expand-Archive -Path '%TEMP%\\node.zip' -DestinationPath '%TEMP%\\node-tmp' -Force"
  xcopy /E /I /Y "%TEMP%\\node-tmp\\node-v20.11.0-win-x64\\*" "node\\" >nul
  rmdir /S /Q "%TEMP%\\node-tmp" 2>nul
)

set "PATH=!APP_DIR!\\node;!PATH!"
set "NODE_PATH=!APP_DIR!\\node_modules"

rem 首次运行初始化
if not exist ".env" (
  echo [首次运行] 生成配置...
  node -e "const fs=require('fs');const c=require('crypto').randomBytes(48).toString('hex');fs.writeFileSync('.env','APP_MODE=local\\nPORT=18765\\nDATABASE_URL=file:./data/novel.db\\nSTORAGE_DRIVER=local\\nSTORAGE_LOCAL_PATH=./data/uploads\\nQUEUE_DRIVER=sqlite\\nAUTH_MODE=local\\nJWT_SECRET='+c+'\\nJWT_EXPIRES_IN=7d\\nAPP_SECRET='+c+'\\nKNOWLEDGE_PATH=./knowledge\\nKNOWLEDGE_RETRIEVAL_MODE=fts\\nLOG_LEVEL=info')"
)

rem 初始化数据库
if not exist "data\\novel.db" (
  echo [首次运行] 初始化数据库...
  if exist "node_modules\\prisma\\build\\index.js" (
    node node_modules\\prisma\\build\\index.js db push --accept-data-loss --schema=prisma\\schema.prisma --skip-generate >nul 2>&1
    node node_modules\\prisma\\build\\index.js generate --schema=prisma\\schema.prisma >nul 2>&1
  )
)

echo.
echo ========================================
echo   AI小说创作系统 v1.4.8
echo ========================================
echo.
echo   启动中... 请稍候
echo.

start "" "http://127.0.0.1:18765"
node server/main.js

echo.
echo 服务已停止。
pause
`);

  writeFileSync(join(EXE_DIR, '停止.bat'), `@echo off
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":18765 " ^| findstr "LISTENING"') do taskkill /PID %%a /F 2>nul
echo 服务已停止
`);

  console.log(`便携版创建完成: ${EXE_DIR}`);
  console.log('双击 "启动.bat" 启动服务');
}
