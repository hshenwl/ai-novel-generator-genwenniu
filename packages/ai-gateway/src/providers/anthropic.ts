// ============================================================
// AI模型网关 - Anthropic Claude提供商
// 补齐: 重试机制、超时处理、AIError错误分类、成本计算
// ============================================================

import { AIModelProvider, ChatInput, ChatResult, ChatChunk, ModelConfig, ModelCapabilities, AIError, TokenUsage } from '../types';

export class AnthropicProvider implements AIModelProvider {
  private config: ModelConfig;
  private baseUrl: string = 'https://api.anthropic.com/v1';
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor(config: ModelConfig) {
    this.config = config;
    if (config.baseUrl) this.baseUrl = config.baseUrl;
  }

  async chat(input: ChatInput): Promise<ChatResult> {
    const startTime = Date.now();
    const maxRetries = this.config.retryConfig?.maxRetries ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.checkRateLimit();

        const systemMessage = input.messages.find(m => m.role === 'system');
        const otherMessages = input.messages.filter(m => m.role !== 'system');

        const controller = new AbortController();
        const timeout = this.config.timeout ?? 120000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(`${this.baseUrl}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': this.config.apiKey || '',
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: input.model || this.config.modelId,
              max_tokens: input.maxTokens ?? this.config.maxTokens ?? 4096,
              system: systemMessage?.content,
              messages: otherMessages.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content,
              })),
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw this.handleErrorResponse(response);
          }

          const data = await response.json() as any;
          const duration = Date.now() - startTime;

          const usage: TokenUsage = {
            promptTokens: data.usage?.input_tokens || 0,
            completionTokens: data.usage?.output_tokens || 0,
            totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
          };

          const cost = this.calculateCost(usage);

          return {
            id: data.id || this.generateId(),
            content: data.content?.[0]?.text || '',
            model: data.model,
            usage,
            finishReason: data.stop_reason || 'end_turn',
            duration,
            cost,
          };
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        lastError = error as Error;
        if (error instanceof AIError && !error.retryable) throw error;
        if (attempt < maxRetries - 1) {
          const delay = this.getRetryDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new AIError('unknown', 'Unknown error after retries');
  }

  async *streamChat(input: ChatInput): AsyncIterable<ChatChunk> {
    const systemMessage = input.messages.find(m => m.role === 'system');
    const otherMessages = input.messages.filter(m => m.role !== 'system');
    const id = this.generateId();

    await this.checkRateLimit();

    const controller = new AbortController();
    const timeout = this.config.timeout ?? 120000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: input.model || this.config.modelId,
          max_tokens: input.maxTokens ?? this.config.maxTokens ?? 4096,
          system: systemMessage?.content,
          messages: otherMessages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw this.handleErrorResponse(response);

      const reader = response.body?.getReader();
      if (!reader) throw new AIError('network', 'No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as any;
              if (data.type === 'content_block_delta') {
                yield { id, delta: data.delta?.text || '' };
              }
              if (data.type === 'message_stop') {
                yield { id, delta: '', finishReason: 'end_turn' };
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async countTokens(text: string): Promise<number> {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'x-api-key': this.config.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
      });
      if (!response.ok) return [this.config.modelId];
      const data = await response.json() as { data?: { id: string }[] };
      return data.data?.map(m => m.id) || [this.config.modelId];
    } catch {
      return [this.config.modelId];
    }
  }

  getCapabilities(): ModelCapabilities {
    return {
      maxContextTokens: 200000,
      supportsStreaming: true,
      supportsVision: this.config.modelId.includes('claude-3'),
      supportsFunctionCall: true,
      supportsJSON: true,
      recommendedFor: ['long_context', 'analysis', 'writing', 'planning'],
    };
  }

  getConfig(): ModelConfig {
    return this.config;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'x-api-key': this.config.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ========== 私有方法 ==========

  private handleErrorResponse(response: Response): AIError {
    const status = response.status;
    if (status === 429) return new AIError('rate_limit', 'Rate limit exceeded', { retryable: true, retryAfter: 60 });
    if (status === 401 || status === 403) return new AIError('invalid_request', 'Invalid API key or unauthorized', { retryable: false });
    if (status === 402) return new AIError('quota_exceeded', 'Quota exceeded', { retryable: false });
    if (status >= 500) return new AIError('model_error', `Server error: ${status}`, { retryable: true });
    return new AIError('invalid_request', `Request failed: ${status}`, { retryable: false });
  }

  private async checkRateLimit(): Promise<void> {
    const rl = this.config.rateLimit;
    if (!rl) return;
    const windowMs = 60000;
    if (this.lastRequestTime && (Date.now() - this.lastRequestTime) < windowMs / rl.requestsPerMinute) {
      const wait = windowMs / rl.requestsPerMinute - (Date.now() - this.lastRequestTime);
      await this.sleep(wait);
    }
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private calculateCost(usage: TokenUsage): number {
    const cpt = this.config.costPerToken;
    if (!cpt) return 0;
    const promptCost = (usage.promptTokens / 1000) * cpt.prompt;
    const completionCost = (usage.completionTokens / 1000) * cpt.completion;
    return Math.round((promptCost + completionCost) * 10000) / 10000;
  }

  private getRetryDelay(attempt: number): number {
    const base = this.config.retryConfig?.retryDelay ?? 1000;
    const exp = this.config.retryConfig?.exponentialBackoff ?? true;
    return exp ? base * Math.pow(2, attempt) : base;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
