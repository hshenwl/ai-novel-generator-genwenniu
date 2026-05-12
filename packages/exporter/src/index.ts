// ============================================================
// 导出工具 - 统一入口
// ============================================================

export * from './types';
export { TxtExporter } from './txt-exporter';
export { DocxExporter } from './docx-exporter';

import { IExporter, ExportOptions, ExportResult, ProjectExportData, ExportFormat } from './types';
import { TxtExporter } from './txt-exporter';
import { DocxExporter } from './docx-exporter';

/**
 * 统一导出器
 */
export class Exporter {
  private exporters: Map<ExportFormat, IExporter> = new Map();

  constructor() {
    this.exporters.set('txt', new TxtExporter());
    this.exporters.set('docx', new DocxExporter());
  }

  /**
   * 导出项目
   */
  async export(data: ProjectExportData, options: ExportOptions): Promise<ExportResult> {
    const exporter = this.exporters.get(options.format);
    if (!exporter) {
      return {
        success: false,
        fileName: `${data.projectName}.${options.format}`,
        fileSize: 0,
        error: `Unsupported format: ${options.format}`
      };
    }
    return exporter.export(data, options);
  }

  /**
   * 获取支持的格式
   */
  getSupportedFormats(): ExportFormat[] {
    return Array.from(this.exporters.keys());
  }

  /**
   * 快速导出为TXT
   */
  async exportTxt(data: ProjectExportData, includeMetadata: boolean = false): Promise<ExportResult> {
    return this.export(data, { format: 'txt', includeMetadata });
  }

  /**
   * 快速导出为DOCX
   */
  async exportDocx(data: ProjectExportData, includeMetadata: boolean = false): Promise<ExportResult> {
    return this.export(data, { format: 'docx', includeMetadata });
  }
}

// 版本信息
export const VERSION = '0.1.0';