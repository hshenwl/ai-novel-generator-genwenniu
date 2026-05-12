// ============================================================
// AI模型网关 - 增强版统一网关服务（含模型降级链）
// ============================================================

import {
  AIModelProvider,
  ChatInput,
  ChatMessage,
  ChatResult,
  ChatChunk,
  ModelConfig,
  CallRecord,
  CallStats,
  AIError
} from './types';
import { OpenAICompatibleProvider } from './providers/openai-compatible';
import { AnthropicProvider } from './providers/anthropic';
import { LocalFlaskProvider, FLASK_PROVIDERS } from './providers/local-flask';

export class AIGateway {
  private providers: Map<string, AIModelProvider> = new Map();
  private configs: Map<string, ModelConfig> = new Map();
  private defaultProvider: string = '';
  private callRecords: CallRecord[] = [];
  private maxRecords: number = 1000;

  private statsAccumulator = {
    totalCalls: 0,
    successCalls: 0,
    totalTokens: 0,
    totalCost: 0,
    totalDuration: 0,
    byAgent: {} as Record<string, { calls: number; tokens: number; cost: number }>,
    byModel: {} as Record<string, { calls: number; tokens: number; cost: number }>,
  };

  constructor() {}

  registerProvider(name: string, config: ModelConfig): void {
    let provider: AIModelProvider;

    // 检查是否是本地 Flask 提供商
    const flaskKey = name.replace('flask-', '').replace('user-', '');
    const flaskConfig = FLASK_PROVIDERS[flaskKey] || FLASK_PROVIDERS[name];
    if (config.provider === 'flask' || config.baseUrl?.startsWith('http://127.0.0.1:') || flaskConfig) {
      const fc = flaskConfig || FLASK_PROVIDERS['chatgpt'];
      provider = new LocalFlaskProvider(config, fc);
    } else {
      switch (config.provider) {
        case 'anthropic':
          provider = new AnthropicProvider(config);
          break;
        case 'openai':
        case 'deepseek':
        case 'zhipu':
        case 'tongyi':
        case 'ollama':
        case 'custom':
        default:
          provider = new OpenAICompatibleProvider(config);
          break;
      }
    }

    this.providers.set(name, provider);
    this.configs.set(name, config);

    if (this.providers.size === 1) {
      this.defaultProvider = name;
    }
  }

  registerProviders(configs: Record<string, ModelConfig>): void {
    for (const [name, config] of Object.entries(configs)) {
      this.registerProvider(name, config);
    }
  }

  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider "${name}" not registered`);
    }
    this.defaultProvider = name;
  }

  getDefaultProvider(): string {
    return this.defaultProvider;
  }

  getProvider(name?: string): AIModelProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new AIError('invalid_request', `Provider "${providerName}" not registered`);
    }
    return provider;
  }

  getProviderConfig(name?: string): ModelConfig | undefined {
    const providerName = name || this.defaultProvider;
    return this.configs.get(providerName);
  }

  /**
   * 聊天完成（带模型降级链）
   * 如果指定模型失败（429/503），自动尝试下一个已注册模型
   */
  async chat(input: ChatInput, providerName?: string): Promise<ChatResult> {
    const firstName = providerName || this.defaultProvider;

    // 构建降级链：指定模型 → 其他已注册模型（排除 ollama 等本地模型）
    const fallbackChain = this.buildFallbackChain(firstName);

    let lastError: Error | null = null;

    for (const name of fallbackChain) {
      const provider = this.providers.get(name);
      const config = this.configs.get(name);
      if (!provider) continue;

      const startTime = Date.now();

      try {
        // 不透传 input.model（provider 已配置正确的 API modelId）
        const providerInput = { ...input };
        delete providerInput.model;
        const result = await provider.chat(providerInput);

        // 记录成功调用
        this.recordCall({
          id: result.id,
          timestamp: new Date(),
          provider: name,
          model: result.model,
          input: {
            messages: this.trimMessages(input.messages),
            metadata: input.metadata
          },
          output: {
            content: result.content ? result.content.slice(0, 500) : '',
            usage: result.usage
          },
          duration: result.duration,
          cost: result.cost ?? 0,
          success: true
        });

        // 如果降级了，记录日志
        if (name !== firstName) {
          console.log(`[AIGateway] Model fallback: ${firstName} → ${name}`);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        const isRetryable = error instanceof AIError && error.retryable;
        const isRateLimit = error instanceof AIError && error.type === 'rate_limit';
        const isServerError = error instanceof AIError && error.type === 'model_error';

        // 记录失败
        this.recordCall({
          id: this.generateId(),
          timestamp: new Date(),
          provider: name,
          model: config?.modelId || 'unknown',
          input: {
            messages: this.trimMessages(input.messages),
            metadata: input.metadata
          },
          output: {
            content: '',
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
          },
          duration: Date.now() - startTime,
          cost: 0,
          success: false,
          error: (error as Error).message
        });

        // 只有限流或服务器错误才降级，其他错误直接抛出
        if (!isRetryable && !isRateLimit && !isServerError) {
          throw error;
        }

        console.warn(`[AIGateway] ${name} failed (${(error as Error).message}), trying next...`);

        // 429 限流时快速跳过（不等待）
        if (isRateLimit) {
          await this.sleep(500);
        }
      }
    }

    // 所有模型都失败了
    throw lastError || new AIError('all_failed', 'All providers failed');
  }

  /**
   * 构建降级链：首选模型 + 其他可用模型
   */
  private buildFallbackChain(preferred: string): string[] {
    const chain: string[] = [preferred];
    for (const name of this.providers.keys()) {
      if (name !== preferred) {
        chain.push(name);
      }
    }
    return chain;
  }

  async *streamChat(input: ChatInput, providerName?: string): AsyncIterable<ChatChunk> {
    const provider = this.getProvider(providerName);
    yield* provider.streamChat(input);
  }

  async countTokens(text: string, providerName?: string): Promise<number> {
    const provider = this.getProvider(providerName);
    return provider.countTokens(text);
  }

  async testProvider(name: string): Promise<boolean> {
    const provider = this.providers.get(name);
    if (!provider) return false;
    return provider.testConnection();
  }

  getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getAllConfigs(): Record<string, ModelConfig> {
    const result: Record<string, ModelConfig> = {};
    for (const [name, config] of this.configs) {
      result[name] = config;
    }
    return result;
  }

  removeProvider(name: string): void {
    this.providers.delete(name);
    this.configs.delete(name);
    if (this.defaultProvider === name) {
      this.defaultProvider = this.providers.keys().next().value || '';
    }
  }

  clearProviders(): void {
    this.providers.clear();
    this.configs.clear();
    this.defaultProvider = '';
  }

  // ========== 统计功能 ==========

  getStats(since?: Date): CallStats {
    if (since) {
      return this.computeStats(since);
    }

    const cache = this.statsAccumulator;
    return {
      totalCalls: cache.totalCalls,
      totalTokens: cache.totalTokens,
      totalCost: cache.totalCost,
      successRate: cache.totalCalls > 0 ? cache.successCalls / cache.totalCalls : 0,
      averageDuration: cache.totalCalls > 0 ? cache.totalDuration / cache.totalCalls : 0,
      byAgent: { ...cache.byAgent },
      byModel: { ...cache.byModel },
    };
  }

  private computeStats(since?: Date): CallStats {
    const records = since
      ? this.callRecords.filter(r => r.timestamp >= since)
      : this.callRecords;

    const totalCalls = records.length;
    const successCalls = records.filter(r => r.success).length;
    const totalTokens = records.reduce((sum, r) => sum + r.output.usage.totalTokens, 0);
    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);

    const byAgent: Record<string, { calls: number; tokens: number; cost: number }> = {};
    const byModel: Record<string, { calls: number; tokens: number; cost: number }> = {};

    for (const record of records) {
      const agentType = record.input.metadata?.agentType || 'unknown';
      if (!byAgent[agentType]) byAgent[agentType] = { calls: 0, tokens: 0, cost: 0 };
      byAgent[agentType].calls++;
      byAgent[agentType].tokens += record.output.usage.totalTokens;
      byAgent[agentType].cost += record.cost;

      const model = record.model;
      if (!byModel[model]) byModel[model] = { calls: 0, tokens: 0, cost: 0 };
      byModel[model].calls++;
      byModel[model].tokens += record.output.usage.totalTokens;
      byModel[model].cost += record.cost;
    }

    return {
      totalCalls, totalTokens, totalCost,
      successRate: totalCalls > 0 ? successCalls / totalCalls : 0,
      averageDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
      byAgent, byModel,
    };
  }

  getRecords(limit?: number): CallRecord[] {
    const records = [...this.callRecords].reverse();
    return limit ? records.slice(0, limit) : records;
  }

  clearRecords(): void {
    this.callRecords = [];
    this.statsAccumulator = {
      totalCalls: 0, successCalls: 0, totalTokens: 0, totalCost: 0, totalDuration: 0,
      byAgent: {}, byModel: {},
    };
  }

  // ========== 私有方法 ==========

  private recordCall(record: CallRecord): void {
    this.callRecords.push(record);

    const cache = this.statsAccumulator;
    cache.totalCalls++;
    if (record.success) cache.successCalls++;
    cache.totalTokens += record.output.usage.totalTokens;
    cache.totalCost += record.cost;
    cache.totalDuration += record.duration;

    const agentType = record.input.metadata?.agentType || 'unknown';
    if (!cache.byAgent[agentType]) cache.byAgent[agentType] = { calls: 0, tokens: 0, cost: 0 };
    cache.byAgent[agentType].calls++;
    cache.byAgent[agentType].tokens += record.output.usage.totalTokens;
    cache.byAgent[agentType].cost += record.cost;

    const model = record.model;
    if (!cache.byModel[model]) cache.byModel[model] = { calls: 0, tokens: 0, cost: 0 };
    cache.byModel[model].calls++;
    cache.byModel[model].tokens += record.output.usage.totalTokens;
    cache.byModel[model].cost += record.cost;

    if (this.callRecords.length > this.maxRecords) {
      this.callRecords.shift();
    }
  }

  private generateId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private trimMessages(messages: ChatMessage[]): any[] {
    return messages.map(m => ({
      role: m.role,
      content: `[${m.content?.length || 0} chars]`,
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
