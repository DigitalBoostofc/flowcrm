import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConversationsService } from './conversations.service';
import { Conversation } from './entities/conversation.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { NotFoundException } from '@nestjs/common';

describe('ConversationsService', () => {
  describe('computeUnread', () => {
    const inboundAt = new Date('2026-04-30T12:00:00Z');
    const beforeMsg = new Date('2026-04-30T11:00:00Z');
    const afterMsg = new Date('2026-04-30T13:00:00Z');

    it('returns false when last message is outbound', () => {
      expect(ConversationsService.computeUnread('outbound', inboundAt, null)).toBe(false);
      expect(ConversationsService.computeUnread('outbound', inboundAt, beforeMsg)).toBe(false);
    });

    it('returns false when there is no last message', () => {
      expect(ConversationsService.computeUnread('inbound', null, null)).toBe(false);
    });

    it('returns true when inbound and never read', () => {
      expect(ConversationsService.computeUnread('inbound', inboundAt, null)).toBe(true);
    });

    it('returns false when inbound and read AFTER message', () => {
      expect(ConversationsService.computeUnread('inbound', inboundAt, afterMsg)).toBe(false);
    });

    it('returns true when inbound and read BEFORE message', () => {
      expect(ConversationsService.computeUnread('inbound', inboundAt, beforeMsg)).toBe(true);
    });

    it('accepts ISO strings for both timestamps', () => {
      expect(ConversationsService.computeUnread('inbound', inboundAt.toISOString(), beforeMsg.toISOString())).toBe(true);
      expect(ConversationsService.computeUnread('inbound', inboundAt.toISOString(), afterMsg.toISOString())).toBe(false);
    });

    it('returns false when direction null/empty', () => {
      expect(ConversationsService.computeUnread(null, inboundAt, null)).toBe(false);
      expect(ConversationsService.computeUnread('', inboundAt, null)).toBe(false);
    });
  });

  describe('markAsRead', () => {
    let service: ConversationsService;
    const mockRepo = {
      update: jest.fn(),
    };
    const mockTenant = { requireWorkspaceId: jest.fn().mockReturnValue('ws-1') } as unknown as TenantContext;

    beforeEach(async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ConversationsService,
          { provide: getRepositoryToken(Conversation), useValue: mockRepo },
          { provide: TenantContext, useValue: mockTenant },
        ],
      }).compile();
      service = module.get<ConversationsService>(ConversationsService);
    });

    it('updates lastReadAt and returns the timestamp', async () => {
      mockRepo.update.mockResolvedValueOnce({ affected: 1 });
      const before = Date.now();
      const result = await service.markAsRead('conv-1');
      const after = Date.now();
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'conv-1', workspaceId: 'ws-1' },
        expect.objectContaining({ lastReadAt: expect.any(Date) }),
      );
      expect(result.id).toBe('conv-1');
      expect(result.lastReadAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.lastReadAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('throws NotFoundException when no row affected', async () => {
      mockRepo.update.mockResolvedValueOnce({ affected: 0 });
      await expect(service.markAsRead('conv-x')).rejects.toThrow(NotFoundException);
    });

    it('scopes update by workspaceId', async () => {
      mockRepo.update.mockResolvedValueOnce({ affected: 1 });
      await service.markAsRead('conv-1');
      const call = mockRepo.update.mock.calls[0][0];
      expect(call.workspaceId).toBe('ws-1');
    });
  });

  describe('findInbox pagination', () => {
    let service: ConversationsService;
    const mockRepo = {
      query: jest.fn(),
    };
    const mockTenant = { requireWorkspaceId: jest.fn().mockReturnValue('ws-1') } as unknown as TenantContext;

    beforeEach(async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ConversationsService,
          { provide: getRepositoryToken(Conversation), useValue: mockRepo },
          { provide: TenantContext, useValue: mockTenant },
        ],
      }).compile();
      service = module.get<ConversationsService>(ConversationsService);
      mockRepo.query.mockReset();
      // First call: COUNT; second: SELECT
      mockRepo.query
        .mockResolvedValueOnce([{ total: 137 }])
        .mockResolvedValueOnce([]);
    });

    it('uses default page=1, pageSize=50 and passes them to LIMIT/OFFSET', async () => {
      const result = await service.findInbox();
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(result.total).toBe(137);
      const selectCall = mockRepo.query.mock.calls[1];
      expect(selectCall[1]).toEqual(['ws-1', 50, 0]);
    });

    it('honors custom page+pageSize and computes offset correctly', async () => {
      mockRepo.query.mockReset();
      mockRepo.query
        .mockResolvedValueOnce([{ total: 200 }])
        .mockResolvedValueOnce([]);
      const result = await service.findInbox({ page: 3, pageSize: 25 });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(25);
      const selectCall = mockRepo.query.mock.calls[1];
      expect(selectCall[1]).toEqual(['ws-1', 25, 50]);
    });

    it('clamps pageSize > 100 to 100', async () => {
      mockRepo.query.mockReset();
      mockRepo.query
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);
      const result = await service.findInbox({ page: 1, pageSize: 500 });
      expect(result.pageSize).toBe(100);
    });

    it('clamps page < 1 to 1', async () => {
      mockRepo.query.mockReset();
      mockRepo.query
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);
      const result = await service.findInbox({ page: 0, pageSize: 10 });
      expect(result.page).toBe(1);
    });
  });
});
