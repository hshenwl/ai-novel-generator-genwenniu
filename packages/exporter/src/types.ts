// ============================================================
// 导出工具 - 核心类型定义
// ============================================================

// 导出格式
export type ExportFormat = 'txt' | 'docx' | 'md' | 'json';

// 导出选项
export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeOutline?: boolean;
  splitByChapter?: boolean;
  encoding?: string;
  fontSize?: number;
  lineHeight?: number;
  outputPath?: string;
}

// 章节导出数据
export interface ChapterExportData {
  chapterNo: number;
  title: string;
  content: string;
  wordCount: number;
  createdAt?: Date;
}

// 项目导出数据
export interface ProjectExportData {
  projectName: string;
  author?: string;
  genre?: string;
  description?: string;
  outline?: string;
  volumes: VolumeExportData[];
  metadata?: Record<string, any>;
}

// 卷导出数据
export interface VolumeExportData {
  volumeNo: number;
  orderIndex?: number;
  title: string;
  description?: string;
  chapters: ChapterExportData[];
}

// 导出结果
export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  outputPath?: string;
  fileCount?: number;
  totalWords?: number;
  error?: string;
}

// 导出器接口
export interface IExporter {
  export(data: ProjectExportData, options: ExportOptions): Promise<ExportResult>;
  getSupportedFormats(): ExportFormat[];
}