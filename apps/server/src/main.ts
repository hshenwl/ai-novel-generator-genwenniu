import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  // 启动前安全校验：自动从 .env 文件读取 JWT_SECRET
  const envPaths = ['.env', '.env.local', '../.env', '../../.env'];
  for (const envPath of envPaths) {
    const absPath = path.resolve(__dirname, envPath);
    if (fs.existsSync(absPath)) {
      const content = fs.readFileSync(absPath, 'utf-8');
      const match = content.match(/^JWT_SECRET\s*=\s*(.+)$/m);
      if (match && !process.env.JWT_SECRET) {
        process.env.JWT_SECRET = match[1].trim();
      }
    }
  }

  const jwtSecret = process.env.JWT_SECRET;
  const insecureDefaults = ['REPLACE-IN-PRODUCTION', 'replace-with-strong-random-secret', 'change-me', 'secret'];
  if (!jwtSecret || insecureDefaults.includes(jwtSecret)) {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║  🔴 JWT Secret 未设置或使用了不安全的默认值                   ║
║                                                              ║
║  请执行以下命令生成强随机 JWT_SECRET：                        ║
║                                                              ║
║  node -e "console.log(require('crypto').randomBytes(          ║
║     64).toString('hex'))"                                    ║
║                                                              ║
║  然后编辑 .env 文件，将 JWT_SECRET 设为生成的值               ║
╚══════════════════════════════════════════════════════════════╝
    `);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 18765);

  // CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:18765',
    ],
    credentials: true,
  });

  // 全局管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  app.useGlobalFilters(new GlobalExceptionFilter());

  // 健康检查端点
  app.use('/api/health', (_req: any, res: any) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      uptime: process.uptime(),
    });
  });

  // 生产模式：从 web 目录提供前端静态文件（支持 dist 和直接部署两种结构）
  const webCandidates = [
    path.resolve(__dirname, '../../web'),
    path.resolve(__dirname, '../../web/dist'),
    path.resolve(__dirname, '../web'),
    path.resolve(__dirname, '../web/dist'),
  ];
  let webDistPath = '';
  for (const candidate of webCandidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      webDistPath = candidate;
      break;
    }
  }

  if (webDistPath) {
    const expressApp = app.getHttpAdapter().getInstance();

    // 通过 Express 的 static 中间件提供前端文件
    try {
      const express = require('express');
      expressApp.use(express.static(webDistPath));

      // SPA 回退：所有非 /api/ 且非静态文件的请求返回 index.html
      expressApp.use((req: any, res: any, next: any) => {
        if (req.path.startsWith('/api/')) return next();
        if (req.method !== 'GET') return next();
        // 如果不是真实文件（如 /login、/projects/xxx），返回 index.html
        res.sendFile(path.join(webDistPath, 'index.html'));
      });
    } catch {
      // express 不可用时，使用自定义文件服务
      expressApp.use((_req: any, res: any, next: any) => {
        if (_req.path.startsWith('/api/')) return next();
        const filePath = path.join(webDistPath, _req.path === '/' ? 'index.html' : _req.path);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.sendFile(filePath);
        } else {
          res.sendFile(path.join(webDistPath, 'index.html'));
        }
      });
    }

    console.log(`  📦 前端静态文件: ${webDistPath}`);
  } else {
    console.log('  📦 前端模式: 开发服务器 (Vite)');
  }

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI小说创作系统 API')
    .setDescription('AI小说工业化创作平台 REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);

  const mode = configService.get('APP_MODE', 'local');
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   AI小说创作系统 v0.1.0                       ║
╠══════════════════════════════════════════════════════════════╣
║  🚀 服务已启动                                                ║
║  📦 本地地址: http://127.0.0.1:${port}                         ║
║  📖 API文档: http://127.0.0.1:${port}/api/docs                 ║
║  🔧 模式: ${mode}                                             ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
