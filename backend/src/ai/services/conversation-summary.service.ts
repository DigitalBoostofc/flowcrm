import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../../conversations/entities/conversation.entity';
import { Message } from '../../messages/entities/message.entity';
import { TenantContext } from '../../common/tenant/tenant-context.service';
import { TenantCacheService } from '../../common/cache/tenant-cache.service';
import { AI_PROVIDER, AiProvider } from '../providers/ai-provider.interface';
import { AiUsageService } from './ai-usage.service';

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_MESSAGES = 50;
const SYSTEM_PROMPT = `Você é um assistente que resume conversas comerciais de um CRM brasileiro de PME.
Escreva o resumo em português, em até 5 linhas, focando em:
- O que o cliente está pedindo ou demonstrando interesse.
- Objeções, dúvidas ou bloqueios mencionados.
- Próximo passo sugerido para o vendedor.
Se a conversa estiver sem mensagens do cliente, diga isso explicitamente.`;

export interface ConversationSummaryResult {
  summary: string;
  cached: boolean;
  model: string;
  tokensUsed: number;
}

@Injectable()
export class ConversationSummaryService {
  private readonly logger = new Logger(ConversationSummaryService.name);

  constructor(
    @InjectRepository(Conversation) private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message) private readonly msgRepo: Repository<Message>,
    private readonly tenant: TenantContext,
    private readonly cache: TenantCacheService,
    private readonly usage: AiUsageService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  async summarize(conversationId: string): Promise<ConversationSummaryResult> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const conversation = await this.convRepo.findOne({ where: { id: conversationId, workspaceId } });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');

    const messages = await this.msgRepo.find({
      where: { conversationId, workspaceId },
      order: { sentAt: 'DESC' },
      take: MAX_MESSAGES,
    });

    if (messages.length === 0) {
      return {
        summary: 'Sem mensagens nesta conversa ainda.',
        cached: false,
        model: 'noop',
        tokensUsed: 0,
      };
    }

    // Mais recente primeiro pra LIMIT, mas o prompt vê em ordem cronológica.
    const ordered = [...messages].reverse();
    const lastMessageId = ordered[ordered.length - 1].id;
    const cacheKey = `ai:summary:${conversationId}:${lastMessageId}`;

    let cached = true;
    const value = await this.cache.getOrSet<ConversationSummaryResult>(cacheKey, CACHE_TTL_MS, async () => {
      cached = false;
      await this.usage.assertBudgetAvailable();
      const userPrompt = ConversationSummaryService.buildPrompt(ordered);
      const completion = await this.provider.complete({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        maxOutputTokens: 400,
        temperature: 0.2,
      });
      await this.usage.recordUsage(completion.usage.totalTokens);
      this.logger.log(
        `summary generated conv=${conversationId} model=${completion.model} tokens=${completion.usage.totalTokens}`,
      );
      return {
        summary: completion.text,
        cached: false,
        model: completion.model,
        tokensUsed: completion.usage.totalTokens,
      };
    });

    return { ...value, cached };
  }

  static buildPrompt(messages: Message[]): string {
    const lines = messages.map((m) => {
      const who = m.direction === 'inbound' ? 'CLIENTE' : 'VENDEDOR';
      const ts = m.sentAt instanceof Date ? m.sentAt.toISOString() : String(m.sentAt);
      return `[${ts}] ${who}: ${m.body}`;
    });
    return `Histórico da conversa (mais antiga primeiro):\n\n${lines.join('\n')}\n\nResuma seguindo as instruções do sistema.`;
  }
}
