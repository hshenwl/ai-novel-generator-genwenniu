// ============================================================
// 导出工具 - DOCX导出器
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { IExporter, ExportOptions, ExportResult, ProjectExportData, ExportFormat } from './types';

// 简化版DOCX生成（不依赖外部库）
// 实际生产环境建议使用 docx 或 officegen 库

export class DocxExporter implements IExporter {
  getSupportedFormats(): ExportFormat[] {
    return ['docx'];
  }

  async export(data: ProjectExportData, options: ExportOptions): Promise<ExportResult> {
    try {
      // 构建文档内容
      const paragraphs: string[] = [];
      
      // 标题
      paragraphs.push(this.createTitle(data.projectName, 44, true));
      paragraphs.push(this.createParagraph(''));
      
      if (data.author) {
        paragraphs.push(this.createParagraph(`作者：${data.author}`, 24));
        paragraphs.push(this.createParagraph(''));
      }
      
      // 分隔线
      paragraphs.push(this.createParagraph('━'.repeat(30)));
      paragraphs.push(this.createParagraph(''));
      
      // 简介
      if (data.description) {
        paragraphs.push(this.createTitle('简介', 28, true));
        paragraphs.push(this.createParagraph(data.description));
        paragraphs.push(this.createParagraph(''));
      }
      
      // 大纲
      if (options.includeOutline && data.outline) {
        paragraphs.push(this.createTitle('大纲', 28, true));
        paragraphs.push(this.createParagraph(data.outline));
        paragraphs.push(this.createParagraph(''));
      }
      
      // 各卷章节
      for (const volume of data.volumes) {
        paragraphs.push(this.createPageBreak());
        paragraphs.push(this.createTitle(`第${volume.volumeNo}卷 ${volume.title}`, 32, true));
        paragraphs.push(this.createParagraph(''));
        
        if (volume.description) {
          paragraphs.push(this.createParagraph(volume.description));
          paragraphs.push(this.createParagraph(''));
        }
        
        for (const chapter of volume.chapters) {
          paragraphs.push(this.createTitle(`第${chapter.chapterNo}章 ${chapter.title}`, 26, true));
          paragraphs.push(this.createParagraph(''));
          paragraphs.push(this.createParagraph(chapter.content));
          paragraphs.push(this.createParagraph(''));
          
          if (options.includeMetadata && chapter.wordCount) {
            paragraphs.push(this.createParagraph(`[字数：${chapter.wordCount}]`, 18, true, '#999999'));
          }
        }
      }
      
      // 生成简化的DOCX XML
      const docContent = this.generateDocxXml(paragraphs);
      const fileName = `${data.projectName}.docx`;
      const filePath = path.join(process.cwd(), 'exports', fileName);
      
      // 确保目录存在
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 生成DOCX文件（ZIP格式）
      await this.generateDocxFile(filePath, docContent);
      
      const stats = fs.statSync(filePath);
      
      return {
        success: true,
        filePath,
        fileName,
        fileSize: stats.size
      };
    } catch (error) {
      return {
        success: false,
        fileName: `${data.projectName}.docx`,
        fileSize: 0,
        error: (error as Error).message
      };
    }
  }

  private createParagraph(text: string, fontSize: number = 22, bold: boolean = false, color?: string): string {
    const sizeAttr = fontSize ? `w:sz="${fontSize}" w:szCs="${fontSize}"` : '';
    const boldAttr = bold ? '<w:b/>' : '';
    const colorAttr = color ? `<w:color w:val="${color.replace('#', '')}"/>` : '';
    
    return `<w:p><w:r><w:rPr ${sizeAttr}>${boldAttr}${colorAttr}</w:rPr><w:t>${this.escapeXml(text)}</w:t></w:r></w:p>`;
  }

  private createTitle(text: string, fontSize: number = 32, bold: boolean = true): string {
    return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr w:sz="${fontSize}" w:szCs="${fontSize}">${bold ? '<w:b/>' : ''}</w:rPr><w:t>${this.escapeXml(text)}</w:t></w:r></w:p>`;
  }

  private createPageBreak(): string {
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private generateDocxXml(paragraphs: string[]): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${paragraphs.join('\n')}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
</w:body>
</w:document>`;
  }

  private async generateDocxFile(filePath: string, content: string): Promise<void> {
    // 使用Node.js的zlib和简单的ZIP格式
    // 实际项目中应使用 archiver 或 jszip 库
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    
    // 添加必需的DOCX结构文件
    zip.addFile('[Content_Types].xml', Buffer.from(this.getContentTypes()));
    zip.addFile('_rels/.rels', Buffer.from(this.getRels()));
    zip.addFile('word/_rels/document.xml.rels', Buffer.from(this.getDocumentRels()));
    zip.addFile('word/document.xml', Buffer.from(content));
    zip.addFile('word/styles.xml', Buffer.from(this.getStyles()));
    
    zip.writeZip(filePath);
  }

  private getContentTypes(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  }

  private getRels(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  }

  private getDocumentRels(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  }

  private getStyles(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="宋体" w:eastAsia="宋体"/><w:sz w:val="21"/></w:rPr></w:rPrDefault></w:docDefaults>
</w:styles>`;
  }
}