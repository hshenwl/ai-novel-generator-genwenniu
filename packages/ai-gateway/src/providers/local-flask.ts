// ============================================================
// AI模型网关 - 本地Flask API代理提供商
// 调用本地运行的 Python Flask 服务器（api/app-*.py）
// ============================================================

import {
  AIModelProvider,
  ChatInput,
  ChatResult,
  ChatChunk,
  ModelConfig,
  ModelCapabilities,
  AIError
} from '../types';

interface FlaskConfig {
  name: string;
  port: number;
  displayName: string;
  description: string;
  defaultModel: string;
}

// 预定义的 Flask 服务器配置
export const FLASK_PROVIDERS: Record<string, FlaskConfig> = {
  'chatgpt': { name: 'chatgpt', port: 20000, displayName: 'ChatGPT', description: 'OpenAI GPT 系列', defaultModel: 'gpt-4' },
  'gemini':  { name: 'gemini',  port: 60000, displayName: 'Gemini',  description: 'Google Gemini 系列', defaultModel: 'gemini-exp-1206' },
  'deepseek':{ name: 'deepseek',port: 60001, displayName: 'DeepSeek', description: 'DeepSeek Chat', defaultModel: 'deepseek-chat' },
  'claude':  { name: 'claude',  port: 60002, displayName: 'Claude',  description: 'Anthropic Claude 系列', defaultModel: 'claude-3-opus' },
  'doubao':  { name: 'doubao',  port: 60003, displayName: '豆包',    description: '字节跳动豆包', defaultModel: 'doubao-pro' },
  'tongyi':  { name: 'tongyi',  port: 60004, displayName: '通义千问', description: '阿里通义千问', defaultModel: 'qwen-max' },
  'wenxin':  { name: 'wenxin',  port: 60005, displayName: '文心一言', description: '百度文心一言', defaultModel: 'ernie-4.0' },
  'ollama':  { name: 'ollama',  port: 11434, displayName: 'Ollama',  description: '本地 Ollama 模型', defaultModel: 'llama3' },
};

export class LocalFlaskProvider implements AIModelProvider {
  private config: ModelConfig;
  private flaskConfig: FlaskConfig;
  private baseUrl: string;

  constructor(config: ModelConfig, flaskConfig: FlaskConfig) {
    this.config = config;
    this.flaskConfig = flaskConfig;
    this.baseUrl = `http://127.0.0.1:${flaskConfig.port}`;
  }

  async chat(input: ChatInput): Promise<ChatResult> {
    const startTime = Date.now();

    // 快速检测 Flask 服务器是否在线
    const online = await this.quickCheck();
    if (!online) {
      throw new AIError('network', `Flask server ${this.flaskConfig.name} (port ${this.flaskConfig.port}) is not running`, { retryable: true });
    }

    try {
      const prompt = this.buildPrompt(input);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch(`${this.baseUrl}/gen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new AIError('model_error', `Flask ${this.flaskConfig.name} returned ${response.status}`, { retryable: true });
      }

      const content = await this.readStreamResponse(response);
      const duration = Date.now() - startTime;
      const estimatedTokens = Math.ceil(content.length / 2);

      return {
        id: `flask_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        content,
        model: this.flaskConfig.defaultModel,
        usage: {
          promptTokens: Math.ceil(prompt.length / 2),
          completionTokens: estimatedTokens,
          totalTokens: Math.ceil(prompt.length / 2) + estimatedTokens,
        },
        finishReason: 'stop',
        duration,
        cost: 0,
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      if ((error as Error).name === 'AbortError') {
        throw new AIError('timeout', `Flask ${this.flaskConfig.name} timeout`, { retryable: true });
      }
      throw new AIError('network', (error as Error).message, { retryable: true });
    }
  }

  /**
   * 快速检测 Flask 服务器是否在线（2秒超时）
   */
  private async quickCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.baseUrl}/`, { signal: controller.signal, method: 'HEAD' });
      clearTimeout(timeout);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 将 ChatInput messages 合并为单个 prompt 字符串
   */
  private buildPrompt(input: ChatInput): string {
    const parts: string[] = [];
    for (const msg of input.messages) {
      if (msg.role === 'system') {
        parts.push(`[系统指令] ${msg.content}`);
      } else if (msg.role === 'assistant') {
        parts.push(`[AI回复] ${msg.content}`);
      } else {
        parts.push(msg.content);
      }
    }
    return parts.join('\n\n');
  }

  /**
   * 读取流式响应（支持 text/plain 和 application/x-ndjson）
   */
  private async readStreamResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new AIError('network', 'No response body');

    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // 尝试解析为 NDJSON（ChatGPT 格式）
          try {
            const json = JSON.parse(line);
            if (json.response) {
              chunks.push(json.response);
            } else if (json.choices?.[0]?.delta?.content) {
              chunks.push(json.choices[0].delta.content);
            }
            continue;
          } catch {
            // 不是 JSON，直接作为文本
          }

          // SSE 格式（data: ...）
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              if (json.choices?.[0]?.delta?.content) {
                chunks.push(json.choices[0].delta.content);
              }
            } catch {
              chunks.push(data);
            }
            continue;
          }

          // 纯文本流
          chunks.push(line);
        }
      }

      // 处理剩余 buffer
      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer);
          if (json.response) chunks.push(json.response);
        } catch {
          chunks.push(buffer);
        }
      }
    } finally {
      reader.releaseLock();
    }

    return chunks.join('');
  }

  async *streamChat(input: ChatInput): AsyncIterable<ChatChunk> {
    const prompt = this.buildPrompt(input);
    const response = await fetch(`${this.baseUrl}/gen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new AIError('model_error', `Flask error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new AIError('network', 'No body');
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          let content = line;
          try {
            const json = JSON.parse(line);
            content = json.response || json.choices?.[0]?.delta?.content || '';
          } catch {}
          if (content) {
            yield { id: `flask_${Date.now()}`, delta: content };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 2);
  }

  async getModels(): Promise<string[]> {
    return [this.flaskConfig.defaultModel];
  }

  getCapabilities(): ModelCapabilities {
    return {
      maxContextTokens: 32000,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCall: false,
      supportsJSON: false,
      recommendedFor: ['writing', 'planning'],
    };
  }

  getConfig(): ModelConfig {
    return this.config;
  }

  async testConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.baseUrl}/`, { signal: controller.signal });
      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
