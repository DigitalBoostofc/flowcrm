/**
 * Contrato neutro de provider de LLM. Existe pra trocar OpenRouter por
 * Anthropic/Vertex/local sem mexer nos services consumidores.
 */
export interface CompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Override do modelo definido em env (opcional). */
  model?: string;
  maxOutputTokens?: number;
  /** Temperatura do gerador. Pode ser ignorada por provider/modelo. */
  temperature?: number;
}

export interface CompletionResponse {
  text: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiProvider {
  complete(req: CompletionRequest): Promise<CompletionResponse>;
}
