// ============================================================
// AI模型网关 - OpenAI兼容提供商（增强版）
// 支持: OpenAI, DeepSeek, Zhipu, Tongyi, Ollama等OpenAI兼容API
// ============================================================

import {
  AIModelProvider,
  ChatInput,
  ChatResult,
  ChatChunk,
  TokenUsage,
  ModelConfig,
  ModelCapabilities,
  AIError
} from '../types';

export class OpenAICompatibleProvider implements AIModelProvider {
  private config: ModelConfig;
  private baseUrl: string;
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor(config: ModelConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || this.getDefaultBaseUrl();
  }

  private getDefaultBaseUrl(): string {
    switch (this.config.provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'deepseek':
        return 'https://api.deepseek.com/v1';
      case 'zhipu':
        return 'https://open.bigmodel.cn/api/paas/v4';
      case 'tongyi':
        return 'https://dashscope.aliyuncs.com/api/v1';
      case 'ollama':
        return 'http://127.0.0.1:11434/v1';
      default:
        return this.config.baseUrl || 'https://api.openai.com/v1';
    }
  }

  async chat(input: ChatInput): Promise<ChatResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    const maxRetries = this.config.retryConfig?.maxRetries ?? 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 速率限制检查
        await this.checkRateLimit();

        const response = await this.makeRequest(input, false);
        const data = await response.json() as OpenAIResponse;
        const duration = Date.now() - startTime;

        const usage: TokenUsage = {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0
        };

        const cost = this.calculateCost(usage);

        return {
          id: data.id || this.generateId(),
          content: data.choices[0]?.message?.content || '',
          model: data.model,
          usage,
          finishReason: data.choices[0]?.finish_reason || 'stop',
          duration,
          cost
        };
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof AIError && !error.retryable) {
          throw error;
        }

        // 指数退避重试（429限流不重试，直接抛出让 gateway 降级到下一个模型）
        if (attempt < maxRetries - 1) {
          const isRateLimit = error instanceof AIError && error.type === 'rate_limit';
          if (isRateLimit) {
            // 429 不重试，直接失败让 gateway 降级
            throw error;
          }
          const baseDelay = 2000;
          const jitter = Math.random() * 1000;
          const delay = baseDelay * Math.pow(2, attempt) + jitter;
          console.log(`[OpenAIProvider] Retrying in ${(delay/1000).toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new AIError('unknown', 'Unknown error after retries');
  }

  async *streamChat(input: ChatInput): AsyncIterable<ChatChunk> {
    await this.checkRateLimit();

    const response = await this.makeRequest(input, true);
    const reader = response.body?.getReader();
    
    if (!reader) {
      throw new AIError('network', 'No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let id = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data) as OpenAIStreamChunk;
              id = parsed.id || id;
              const delta = parsed.choices[0]?.delta?.content || '';
              const finishReason = parsed.choices[0]?.finish_reason;

              if (delta || finishReason) {
                yield {
                  id,
                  delta,
                  finishReason,
                  usage: parsed.usage ? {
                    promptTokens: parsed.usage.prompt_tokens,
                    completionTokens: parsed.usage.completion_tokens,
                    totalTokens: parsed.usage.total_tokens
                  } : undefined
                };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async countTokens(text: string): Promise<number> {
    // 简单估算：中文约1.5字符/token，英文约4字符/token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders()
      });

      if (!response.ok) return [this.config.modelId];

      const data = await response.json() as { data?: { id: string }[] };
      return data.data?.map(m => m.id) || [this.config.modelId];
    } catch {
      return [this.config.modelId];
    }
  }

  getCapabilities(): ModelCapabilities {
    return this.getCapabilitiesByModel(this.config.modelId);
  }

  getConfig(): ModelConfig {
    return this.config;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ========== 私有方法 ==========

  private async makeRequest(input: ChatInput, stream: boolean): Promise<Response> {
    const controller = new AbortController();
    const timeout = this.config.timeout ?? 120000; // 默认2分钟超时

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: input.model || this.config.modelId,
          messages: input.messages,
          temperature: input.temperature ?? this.config.temperature ?? 0.7,
          max_tokens: input.maxTokens ?? this.config.maxTokens ?? 4096,
          top_p: input.topP,
          frequency_penalty: input.frequencyPenalty,
          presence_penalty: input.presencePenalty,
          stop: input.stop,
          stream
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw this.handleErrorResponse(response);
      }

      this.requestCount++;
      this.lastRequestTime = Date.now();

      return response;
    } catch (error) {
      if (error instanceof AIError) throw error;
      if ((error as Error).name === 'AbortError') {
        throw new AIError('timeout', 'Request timeout', { retryable: true });
      }
      throw new AIError('network', (error as Error).message, { retryable: true });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Ollama不需要API Key
    if (this.config.provider !== 'ollama' && this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  private handleErrorResponse(response: Response): AIError {
    const status = response.status;

    if (status === 429) {
      return new AIError('rate_limit', 'Rate limit exceeded', {
        retryable: true,
        retryAfter: 60
      });
    }

    if (status === 401 || status === 403) {
      return new AIError('invalid_request', 'Invalid API key or unauthorized', {
        retryable: false
      });
    }

    if (status === 402) {
      return new AIError('quota_exceeded', 'Quota exceeded', {
        retryable: false
      });
    }

    if (status >= 500) {
      return new AIError('model_error', `Server error: ${status}`, {
        retryable: true
      });
    }

    if (status === 404) {
      return new AIError('model_error', `Model not found: ${status}`, {
        retryable: true
      });
    }

    return new AIError('invalid_request', `Request failed: ${status}`, {
      retryable: false
    });
  }

  private async checkRateLimit(): Promise<void> {
    const rateLimit = this.config.rateLimit;
    if (!rateLimit) return;

    const now = Date.now();
    const windowMs = 60000; // 1分钟窗口

    // 简单的速率限制检查
    if (this.lastRequestTime && (now - this.lastRequestTime) < windowMs / rateLimit.requestsPerMinute) {
      const waitTime = windowMs / rateLimit.requestsPerMinute - (now - this.lastRequestTime);
      await this.sleep(waitTime);
    }
  }

  private calculateCost(usage: TokenUsage): number {
    const costPerToken = this.config.costPerToken;
    if (!costPerToken) return 0;

    const promptCost = (usage.promptTokens / 1000) * costPerToken.prompt;
    const completionCost = (usage.completionTokens / 1000) * costPerToken.completion;

    return Math.round((promptCost + completionCost) * 10000) / 10000;
  }

  private getRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryConfig?.retryDelay ?? 1000;
    const exponential = this.config.retryConfig?.exponentialBackoff ?? true;

    if (exponential) {
      return baseDelay * Math.pow(2, attempt);
    }
    return baseDelay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCapabilitiesByModel(modelId: string): ModelCapabilities {
    // 根据模型ID判断能力
    const isGPT4 = modelId.includes('gpt-4');
    const isClaude = modelId.includes('claude');
    const isGemini = modelId.includes('gemini');

    return {
      maxContextTokens: isGPT4 ? 128000 : (isClaude ? 200000 : 4096),
      supportsStreaming: true,
      supportsVision: isGPT4 || isGemini,
      supportsFunctionCall: isGPT4 || isClaude,
      supportsJSON: isGPT4 || isClaude,
      recommendedFor: this.getRecommendedUseCases(modelId)
    };
  }

  private getRecommendedUseCases(modelId: string): string[] {
    const useCases: string[] = [];

    if (modelId.includes('gpt-4')) {
      useCases.push('planning', 'auditing', 'complex_reasoning');
    }
    if (modelId.includes('gpt-3.5') || modelId.includes('deepseek')) {
      useCases.push('writing', 'quick_tasks');
    }
    if (modelId.includes('claude')) {
      useCases.push('long_context', 'analysis', 'writing');
    }

    return useCases;
  }
}

// OpenAI API响应类型
interface OpenAIResponse {
  id?: string;
  model: string;
  choices: {
    message?: { content: string };
    finish_reason?: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  id?: string;
  choices: {
    delta?: { content?: string };
    finish_reason?: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
