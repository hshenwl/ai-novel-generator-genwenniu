export type FlavorCategory = 'A' | 'B' | 'C' | 'D' | 'E';
export type FlavorIntensity = 'light' | 'standard' | 'strong';

export interface FlavorMode {
  id: string;
  category: FlavorCategory;
  name: string;
  description: string;
  checkPatterns: string[];
  rewriteGuidance: string;
}

export interface FlavorExecutionInput {
  content: string;
  intensity: FlavorIntensity;
  categories?: FlavorCategory[];
  writingStyle?: string;
}

export interface FlavorExecutionResult {
  originalContent: string;
  processedContent: string;
  appliedModes: string[];
  detectedIssues: Array<{ mode: string; category: FlavorCategory; matches: string[] }>;
  summary: string;
}
