// ============================================================
// 安装包打包脚本
// 使用方法: node scripts/package-installer.js
// 前置条件: 先运行 deploy\local-win\build.bat 生成 dist/
// ============================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const OUTPUT_DIR = path.join(ROOT, 'release');
const VERSION = '0.1.0';

function main() {
  console.log('========================================');
  console.log('  AI小说创作系统 - 安装包打包');
  console.log(`  版本: ${VERSION}`);
  console.log('========================================\n');

  // 检查 dist 目录
  if (!fs.existsSync(DIST_DIR)) {
    console.error('错误: 未找到 dist/ 目录！');
    console.error('请先运行 deploy\\local-win\\build.bat 构建发布包。');
    process.exit(1);
  }

  if (!fs.existsSync(path.join(DIST_DIR, 'server', 'main.js'))) {
    console.error('错误: dist/server/main.js 不存在，构建可能不完整！');
    process.exit(1);
  }

  // 创建输出目录
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 获取 dist 大小
  const totalSize = getDirSize(DIST_DIR);
  console.log(`  发布包大小: ${formatSize(totalSize)}\n`);

  // 选项 1: 生成 7-Zip 自解压包 (推荐, 需要 7z 命令)
  try {
    execSync('7z --help', { stdio: 'ignore' });
    console.log('[1/2] 检测到 7-Zip，创建自解压安装包...');
    
    const sfxFile = path.join(OUTPUT_DIR, `AI-Novel-Studio-Setup-${VERSION}.exe`);
    const sfxConfig = path.join(OUTPUT_DIR, 'sfx.conf');
    
    // 创建 7z 存档
    const archiveFile = path.join(OUTPUT_DIR, 'dist.7z');
    execSync(
      `7z a -mx=9 "${archiveFile}" "${DIST_DIR}\\*"`,
      { stdio: 'inherit', cwd: ROOT }
    );
    
    // 创建自解压配置
    const configContent = `;!@Install@!UTF-8!
Title="AI小说创作系统 v${VERSION}"
BeginPrompt="是否安装 AI小说创作系统 v${VERSION}？"
RunProgram="install.bat"
Directory="%LOCALAPPDATA%\\AI-Novel-Studio"
;!@InstallEnd@!`;
    
    fs.writeFileSync(sfxConfig, configContent);
    
    // 合并为自解压包
    execSync(
      `copy /B "${path.join(ROOT, '7zS.sfx')}" + "${sfxConfig}" + "${archiveFile}" "${sfxFile}"`,
      { stdio: 'inherit' }
    );
    
    // 清理临时文件
    fs.unlinkSync(archiveFile);
    fs.unlinkSync(sfxConfig);
    
    console.log(`  ✅ 安装包已创建: ${sfxFile}`);
  } catch {
    console.log('[1/2] 未检测到 7-Zip，尝试备用打包方式...');
    
    // 选项 2: 创建 ZIP 压缩包
    console.log('[2/2] 创建 ZIP 压缩包...');
    const zipFile = path.join(OUTPUT_DIR, `AI-Novel-Studio-${VERSION}.zip`);
    
    try {
      execSync(
        `powershell Compress-Archive -Path "${DIST_DIR}\\*" -DestinationPath "${zipFile}" -Force`,
        { stdio: 'inherit' }
      );
      console.log(`  ✅ ZIP 包已创建: ${zipFile}`);
      console.log('  ⚠ 注意: ZIP 包需要手动解压后运行 install.bat');
    } catch {
      console.error('  ❌ 创建 ZIP 包失败，请手动压缩 dist/ 目录。');
    }
  }

  // 复制安装/部署脚本到输出目录
  const deployDir = path.join(ROOT, 'deploy', 'local-win');
  if (fs.existsSync(deployDir)) {
    fs.cpSync(deployDir, OUTPUT_DIR, { recursive: true, filter: (src) => {
      return src.endsWith('.bat') || src.endsWith('.md');
    }});
  }

  const finalSize = getDirSize(OUTPUT_DIR);
  console.log(`\n  输出目录: ${OUTPUT_DIR}`);
  console.log(`  总大小: ${formatSize(finalSize)}`);
  console.log('\n========================================');
  console.log('  打包完成！');
  console.log('========================================');
}

function getDirSize(dirPath) {
  let total = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        total += fs.statSync(fullPath).size;
      } else if (entry.isDirectory()) {
        total += getDirSize(fullPath);
      }
    }
  } catch {}
  return total;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

main();
