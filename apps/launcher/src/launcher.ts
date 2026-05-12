// ============================================================
// Windows启动器 - 启动脚本
// ============================================================

import { spawn, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface LauncherConfig {
  port: number;
  backendDir: string;
  frontendDir: string;
  dataDir: string;
  openBrowser: boolean;
  showConsole: boolean;
}

const defaultConfig: LauncherConfig = {
  port: 18765,
  backendDir: './apps/server',
  frontendDir: './apps/web',
  dataDir: './data',
  openBrowser: true,
  showConsole: true
};

/**
 * Windows启动器
 */
export class WindowsLauncher {
  private config: LauncherConfig;
  private backendProcess: any = null;
  private frontendProcess: any = null;

  constructor(config: Partial<LauncherConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * 启动服务
   */
  async start(): Promise<void> {
    console.log('========================================');
    console.log('  AI小说创作系统 - 正在启动...');
    console.log('========================================');
    console.log('');

    // 1. 检查环境
    await this.checkEnvironment();

    // 2. 创建数据目录
    this.ensureDirectories();

    // 3. 启动后端服务
    await this.startBackend();

    // 4. 等待服务就绪
    await this.waitForBackend();

    // 5. 打开浏览器
    if (this.config.openBrowser) {
      this.openBrowserWindow();
    }

    console.log('');
    console.log('✓ 服务启动成功！');
    console.log(`✓ 访问地址: http://127.0.0.1:${this.config.port}`);
    console.log('');
    console.log('按 Ctrl+C 停止服务...');
  }

  /**
   * 检查运行环境
   */
  private async checkEnvironment(): Promise<void> {
    console.log('[1/4] 检查运行环境...');

    // 检查Node.js
    const nodeVersion = process.version;
    console.log(`  - Node.js 版本: ${nodeVersion}`);

    // 检查依赖
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('  - 未找到依赖，正在安装...');
      await this.runCommand('pnpm', ['install']);
    } else {
      console.log('  - 依赖已安装');
    }

    // 检查数据库
    const dbPath = path.join(process.cwd(), this.config.dataDir, 'novel.db');
    if (!fs.existsSync(dbPath)) {
      console.log('  - 初始化数据库...');
      await this.runCommand('pnpm', ['db:push']);
    }
  }

  /**
   * 确保目录存在
   */
  private ensureDirectories(): void {
    console.log('[2/4] 创建数据目录...');
    
    const dirs = [
      this.config.dataDir,
      path.join(this.config.dataDir, 'backups'),
      path.join(this.config.dataDir, 'exports'),
      './uploads'
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  - 创建目录: ${dir}`);
      }
    }
  }

  /**
   * 启动后端服务
   */
  private async startBackend(): Promise<void> {
    console.log('[3/4] 启动后端服务...');

    return new Promise((resolve, reject) => {
      this.backendProcess = spawn('node', ['dist/main.js'], {
        cwd: this.config.backendDir,
        env: {
          ...process.env,
          PORT: String(this.config.port),
          DATABASE_URL: `file:../../${this.config.dataDir}/novel.db`,
          KNOWLEDGE_PATH: process.env.KNOWLEDGE_PATH || path.resolve(process.cwd(), 'knowledge')
        },
        stdio: this.config.showConsole ? 'inherit' : 'pipe'
      });

      this.backendProcess.on('error', (err: Error) => {
        console.error('后端服务启动失败:', err);
        reject(err);
      });

      // 等待一下让服务启动
      setTimeout(resolve, 1000);
    });
  }

  /**
   * 等待后端服务就绪
   */
  private async waitForBackend(): Promise<void> {
    console.log('[4/4] 等待服务就绪...');

    const maxRetries = 30;
    const retryInterval = 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`http://127.0.0.1:${this.config.port}/api/health`);
        if (response.ok) {
          console.log('  - 服务就绪');
          return;
        }
      } catch {
        // 继续等待
      }
      
      await this.sleep(retryInterval);
      process.stdout.write(`\r  - 等待中... (${i + 1}/${maxRetries})`);
    }

    throw new Error('服务启动超时');
  }

  /**
   * 打开浏览器窗口
   */
  private openBrowserWindow(): void {
    const url = `http://127.0.0.1:${this.config.port}`;
    
    // Windows使用start命令
    exec(`start ${url}`, (error) => {
      if (error) {
        console.log(`请手动打开浏览器访问: ${url}`);
      }
    });
  }

  /**
   * 停止服务
   */
  stop(): void {
    console.log('\n正在停止服务...');
    
    if (this.backendProcess) {
      this.backendProcess.kill();
    }
    
    if (this.frontendProcess) {
      this.frontendProcess.kill();
    }
    
    console.log('服务已停止');
    process.exit(0);
  }

  /**
   * 运行命令
   */
  private runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { stdio: 'inherit' });
      proc.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
      proc.on('error', reject);
    });
  }

  /**
   * 睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 主函数
async function main() {
  const launcher = new WindowsLauncher();

  // 监听退出信号
  process.on('SIGINT', () => launcher.stop());
  process.on('SIGTERM', () => launcher.stop());

  try {
    await launcher.start();
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

// 运行
main();