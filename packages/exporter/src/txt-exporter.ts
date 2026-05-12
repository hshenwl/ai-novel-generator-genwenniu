// ============================================================
// 导出工具 - TXT导出器
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { IExporter, ExportOptions, ExportResult, ProjectExportData, ExportFormat } from './types';

export class TxtExporter implements IExporter {
  getSupportedFormats(): ExportFormat[] {
    return ['txt'];
  }

  async export(data: ProjectExportData, options: ExportOptions): Promise<ExportResult> {
    try {
      const lines: string[] = [];

      // 标题
      lines.push('═'.repeat(50));
      lines.push(`《${data.projectName}》`);
      lines.push(`作者: ${data.author || '佚名'}`);
      lines.push(`日期: ${new Date().toLocaleDateString('zh-CN')}`);
      lines.push('═'.repeat(50));
      lines.push('');

      // 简介
      if (data.description) {
        lines.push('【简介】');
        lines.push(data.description);
        lines.push('');
      }

      // 完整导出
      if (options.splitByChapter === false) {
        for (const volume of data.volumes) {
          lines.push(`# ${volume.title || `第${volume.orderIndex ?? volume.volumeNo}卷`}`);
          lines.push('');

          for (const chapter of volume.chapters) {
            lines.push(`## 第${chapter.chapterNo}章 ${chapter.title || ''}`);
            lines.push('');
            lines.push(chapter.content || '');
            lines.push('');
          }
        }
      }

      // 目录结构
      const baseDir = options.outputPath || './exports';
      const dir = path.join(baseDir, data.projectName.replace(/[/\\?%*:|"<>]/g, '_'));

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (options.splitByChapter !== false) {
        const outputPath = path.join(dir, `${data.projectName}_完整版.txt`);
        const enc = (options.encoding || 'utf-8') as string;
        fs.writeFileSync(outputPath, lines.join('\n'), { encoding: enc } as any);
      }

      // 按章节拆分导出
      if (options.splitByChapter !== false) {
        for (const volume of data.volumes) {
          const volumeDir = path.join(dir, volume.title || `第${volume.orderIndex ?? volume.volumeNo}卷`);

          if (!fs.existsSync(volumeDir)) {
            fs.mkdirSync(volumeDir, { recursive: true });
          }

          for (const chapter of volume.chapters) {
            const fileName = `第${chapter.chapterNo}章_${chapter.title}.txt`;
            const filePath = path.join(volumeDir, fileName);
            const content = `${chapter.title}\n\n${chapter.content}`;
            const enc = (options.encoding || 'utf-8') as string;
            fs.writeFileSync(filePath, content, { encoding: enc } as any);
          }
        }
      }

      return {
        success: true,
        outputPath: dir,
        fileCount: data.volumes.reduce((sum, v) => sum + v.chapters.length, 0),
        totalWords: data.volumes.reduce((sum, v) =>
          sum + v.chapters.reduce((s, c) => s + (c.wordCount || 0), 0), 0),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        outputPath: '',
        fileCount: 0,
        totalWords: 0,
      };
    }
  }
}
