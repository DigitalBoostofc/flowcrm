import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ConversationSummaryService } from './conversation-summary.service';
import { Conversation } from '../../conversations/entities/conversation.entity';
import { Message } from '../../messages/entities/message.entity';
import { TenantContext } from '../../common/tenant/tenant-context.service';
import { TenantCacheService } from '../../common/cache/tenant-cache.service';
import { AiUsageService } from './ai-usage.service';
import { AI_PROVIDER, AiProvider } from '../providers/ai-provider.interface';

describe('ConversationSummaryService', () => {
  const convFindOne = jest.fn();
  const msgFind = jest.fn();
  const tenant = { requireWorkspaceId: jest.fn().mockReturnValue('ws-1') } as unknown as TenantContext;
  const cache = { getOrSet: jest.fn() } as unknown as TenantCacheService;
  const usage: jest.Mocked<AiUsageService> = {
    assertBudgetAvailable: jest.fn(),
    recordUsage: jest.fn(),
  } as unknown as jest.Mocked<AiUsageService>;
  const provider: jest.Mocked<AiProvider> = { complete: jest.fn() };

  let service: ConversationSummaryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationSummaryService,
        { provide: getRepositoryToken(Conversation), useValue: { findOne: convFindOne } },
        { provide: getRepositoryToken(Message), useValue: { find: msgFind } },
        { provide: TenantContext, useValue: tenant },
        { provide: TenantCacheService, useValue: cache },
        { provide: AiUsageService, useValue: usage },
        { provide: AI_PROVIDER, useValue: provider },
      ],
    }).compile();
    service = module.get(ConversationSummaryService);
  });

  it('throws NotFound when conversation does not belong to workspace', async () => {
    convFindOne.mockResolvedValueOnce(null);
    await expect(service.summarize('conv-x')).rejects.toThrow(NotFoundException);
  });

  it('returns trivial summary when conversation has no messages', async () => {
    convFindOne.mockResolvedValueOnce({ id: 'conv-1' });
    msgFind.mockResolvedValueOnce([]);
    const result = await service.summarize('conv-1');
    expect(result.summary).toMatch(/sem mensagens/i);
    expect(result.tokensUsed).toBe(0);
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it('calls provider, records usage, and surfaces cached=false on cache miss', async () => {
    convFindOne.mockResolvedValueOnce({ id: 'conv-1' });
    msgFind.mockResolvedValueOnce([
      { id: 'm1', body: 'Olá', direction: 'inbound', sentAt: new Date('2026-04-30T10:00:00Z') },
      { id: 'm2', body: 'Oi tudo bem', direction: 'outbound', sentAt: new Date('2026-04-30T10:01:00Z') },
    ]);
    provider.complete.mockResolvedValueOnce({
      text: 'Cliente cumprimentou. Vendedor respondeu.',
      model: 'google/gemini-2.5-flash-lite',
      usage: { inputTokens: 50, outputTokens: 20, totalTokens: 70 },
    });
    // cache.getOrSet executa o factory na primeira chamada
    (cache.getOrSet as jest.Mock).mockImplementationOnce(async (_key, _ttl, factory) => factory());

    const out = await service.summarize('conv-1');

    expect(usage.assertBudgetAvailable).toHaveBeenCalledTimes(1);
    expect(provider.complete).toHaveBeenCalledTimes(1);
    expect(usage.recordUsage).toHaveBeenCalledWith(70);
    expect(out).toEqual({
      summary: 'Cliente cumprimentou. Vendedor respondeu.',
      cached: false,
      model: 'google/gemini-2.5-flash-lite',
      tokensUsed: 70,
    });
  });

  it('returns cached=true when cache hit (factory not invoked)', async () => {
    convFindOne.mockResolvedValueOnce({ id: 'conv-1' });
    msgFind.mockResolvedValueOnce([
      { id: 'm1', body: 'Olá', direction: 'inbound', sentAt: new Date('2026-04-30T10:00:00Z') },
    ]);
    (cache.getOrSet as jest.Mock).mockResolvedValueOnce({
      summary: 'cached value',
      cached: false,
      model: 'google/gemini-2.5-flash-lite',
      tokensUsed: 70,
    });

    const out = await service.summarize('conv-1');

    expect(provider.complete).not.toHaveBeenCalled();
    expect(usage.recordUsage).not.toHaveBeenCalled();
    expect(out.cached).toBe(true);
    expect(out.summary).toBe('cached value');
  });

  describe('buildPrompt', () => {
    it('renders messages chronologically with role labels', () => {
      const msgs = [
        { id: '1', body: 'Oi', direction: 'inbound', sentAt: new Date('2026-04-30T10:00:00Z') },
        { id: '2', body: 'Olá!', direction: 'outbound', sentAt: new Date('2026-04-30T10:01:00Z') },
      ] as Message[];
      const prompt = ConversationSummaryService.buildPrompt(msgs);
      expect(prompt).toContain('CLIENTE: Oi');
      expect(prompt).toContain('VENDEDOR: Olá!');
      expect(prompt.indexOf('CLIENTE')).toBeLessThan(prompt.indexOf('VENDEDOR'));
    });
  });
});
