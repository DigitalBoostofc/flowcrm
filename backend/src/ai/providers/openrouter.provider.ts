import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AiProvider, CompletionRequest, CompletionResponse } from './ai-provider.interface';

/**
 * Provider OpenRouter (https://openrouter.ai). Schema OpenAI-compatible:
 * POST /chat/completions com {model, messages, max_tokens}.
 *
 * Modelo default vem de AI_MODEL_SUMMARY (env). Per-call override via
 * CompletionRequest.model. Sem API key configurada → ServiceUnavailable.
 */
@Injectable()
export class OpenRouterProvider implements AiProvider {
  private readonly logger = new Logger(OpenRouterProvider.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: 15_000,
      headers: {
        'Content-Type': 'application/json',
        'HTTP-Referer': this.config.get<string>('FRONTEND_URL') ?? 'https://flowcrm.app',
        'X-Title': 'FlowCRM',
      },
    });
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('Assistente IA não configurado (OPENROUTER_API_KEY ausente).');
    }
    const model = req.model ?? this.config.get<string>('AI_MODEL_SUMMARY') ?? 'google/gemini-2.5-flash-lite';

    const payload = {
      model,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
      max_tokens: req.maxOutputTokens ?? 600,
      temperature: req.temperature ?? 0.3,
    };

    try {
      const res = await this.http.post('/chat/completions', payload, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = res.data as OpenRouterResponse;
      const choice = data.choices?.[0];
      const text = choice?.message?.content?.trim() ?? '';
      if (!text) {
        throw new Error('Resposta vazia do provider.');
      }
      return {
        text,
        model: data.model ?? model,
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
        },
      };
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? `OpenRouter ${err.response?.status ?? 'sem-status'}: ${JSON.stringify(err.response?.data ?? err.message).slice(0, 300)}`
        : (err as Error).message;
      this.logger.error(`complete failed (${model}): ${message}`);
      throw new ServiceUnavailableException('Falha ao consultar o provedor de IA. Tente novamente em alguns instantes.');
    }
  }
}

interface OpenRouterResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}
