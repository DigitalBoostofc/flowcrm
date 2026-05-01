import { api } from './client';

export interface ConversationSummary {
  summary: string;
  cached: boolean;
  model: string;
  tokensUsed: number;
}

export async function summarizeConversation(conversationId: string): Promise<ConversationSummary> {
  const res = await api.post<ConversationSummary>(`/conversations/${conversationId}/ai/summary`);
  return res.data;
}
