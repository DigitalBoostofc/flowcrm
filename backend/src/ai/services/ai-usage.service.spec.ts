import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AiUsageService } from './ai-usage.service';
import { WorkspaceAiUsage } from '../entities/workspace-ai-usage.entity';
import { TenantContext } from '../../common/tenant/tenant-context.service';

describe('AiUsageService', () => {
  describe('currentMonth', () => {
    it('formats YYYY-MM in UTC with zero-padded month', () => {
      expect(AiUsageService.currentMonth(new Date('2026-01-15T12:00:00Z'))).toBe('2026-01');
      expect(AiUsageService.currentMonth(new Date('2026-12-01T00:00:00Z'))).toBe('2026-12');
    });
  });

  describe('assertBudgetAvailable', () => {
    let service: AiUsageService;
    const findOne = jest.fn();
    const tenant = { requireWorkspaceId: jest.fn().mockReturnValue('ws-1') } as unknown as TenantContext;
    const config = { get: jest.fn() } as unknown as ConfigService;

    beforeEach(async () => {
      jest.clearAllMocks();
      (config.get as jest.Mock).mockImplementation((k: string) =>
        k === 'AI_DEFAULT_MONTHLY_BUDGET_TOKENS' ? 1000 : undefined,
      );
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AiUsageService,
          { provide: getRepositoryToken(WorkspaceAiUsage), useValue: { findOne, query: jest.fn() } },
          { provide: TenantContext, useValue: tenant },
          { provide: ConfigService, useValue: config },
        ],
      }).compile();
      service = module.get(AiUsageService);
    });

    it('returns silently when no usage row exists yet', async () => {
      findOne.mockResolvedValueOnce(null);
      await expect(service.assertBudgetAvailable()).resolves.toBeUndefined();
    });

    it('returns silently when under budget', async () => {
      findOne.mockResolvedValueOnce({ tokensUsed: 500, monthlyBudgetTokens: null });
      await expect(service.assertBudgetAvailable()).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when env default budget exhausted', async () => {
      findOne.mockResolvedValueOnce({ tokensUsed: 1500, monthlyBudgetTokens: null });
      await expect(service.assertBudgetAvailable()).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when row-specific budget exhausted', async () => {
      findOne.mockResolvedValueOnce({ tokensUsed: 200, monthlyBudgetTokens: 100 });
      await expect(service.assertBudgetAvailable()).rejects.toThrow(ForbiddenException);
    });

    it('row-specific budget overrides env default', async () => {
      findOne.mockResolvedValueOnce({ tokensUsed: 1500, monthlyBudgetTokens: 5000 });
      await expect(service.assertBudgetAvailable()).resolves.toBeUndefined();
    });
  });
});
