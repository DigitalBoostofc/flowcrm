import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConversationsService } from './conversations.service';
import { Conversation } from './entities/conversation.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { PipelinesService } from '../pipelines/pipelines.service';
import { NotFoundException } from '@nestjs/common';

const mockContacts = { create: jest.fn(), findByPhone: jest.fn() } as unknown as ContactsService;
const mockLeads = { create: jest.fn() } as unknown as LeadsService;
const mockPipelines = { findDefault: jest.fn() } as unknown as PipelinesService;

const EXTRA_PROVIDERS = [
  { provide: ContactsService, useValue: mockContacts },
  { provide: LeadsService, useValue: mockLeads },
  { provide: PipelinesService, useValue: mockPipelines },
];

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
    const mockRepo = { update: jest.fn() };
    const mockTenant = { requireWorkspaceId: jest.fn().mockReturnValue('ws-1') } as unknown as TenantContext;

    beforeEach(async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ConversationsService,
          { provide: getRepositoryToken(Conversation), useValue: mockRepo },
          { provide: TenantContext, useValue: mockTenant },
          ...EXTRA_PROVIDERS,
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

  describe('findOrCreate', () => {
    let service: ConversationsService;
    const mockRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((c) => Promise.resolve({ id: 'new-conv', ...c })),
    };
    const mockTenant = { requireWorkspaceId: jest.fn().mockReturnValue('ws-1') } as unknown as TenantContext;

    beforeEach(async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ConversationsService,
          { provide: getRepositoryToken(Conversation), useValue: mockRepo },
          { provide: TenantContext, useValue: mockTenant },
          ...EXTRA_PROVIDERS,
        ],
      }).compile();
      service = module.get<ConversationsService>(ConversationsService);
    });

    it('returns existing conversation when externalId matches', async () => {
      const existing = { id: 'conv-1', leadId: 'l-1', channelType: 'evolution', externalId: '5511999', workspaceId: 'ws-1' };
      mockRepo.findOne.mockResolvedValueOnce(existing);
      const result = await service.findOrCreate('l-1', 'evolution', '5511999');
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { leadId: 'l-1', channelType: 'evolution', externalId: '5511999', workspaceId: 'ws-1' },
      });
      expect(result).toBe(existing);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('creates new conversation when externalId is different (lead trocou de número)', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.findOrCreate('l-1', 'evolution', '5511BBB');
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { leadId: 'l-1', channelType: 'evolution', externalId: '5511BBB', workspaceId: 'ws-1' },
      });
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        leadId: 'l-1', channelType: 'evolution', externalId: '5511BBB', workspaceId: 'ws-1',
      }));
      expect(result.id).toBe('new-conv');
    });

    it('falls back to legacy lookup (leadId + channelType) when externalId not provided', async () => {
      const existing = { id: 'conv-legacy', leadId: 'l-1', channelType: 'meta', externalId: null, workspaceId: 'ws-1' };
      mockRepo.findOne.mockResolvedValueOnce(existing);
      const result = await service.findOrCreate('l-1', 'meta');
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { leadId: 'l-1', channelType: 'meta', workspaceId: 'ws-1' },
      });
      expect(result).toBe(existing);
    });

    it('legacy lookup also creates when nothing found', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      await service.findOrCreate('l-1', 'meta');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: 'l-1', channelType: 'meta', workspaceId: 'ws-1', externalId: undefined }),
      );
    });
  });

  describe('findInbox pagination', () => {
    let service: ConversationsService;
    const mockRepo = { query: jest.fn() };
    const mockTenant = { requireWorkspaceId: jest.fn().mockReturnValue('ws-1') } as unknown as TenantContext;

    beforeEach(async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ConversationsService,
          { provide: getRepositoryToken(Conversation), useValue: mockRepo },
          { provide: TenantContext, useValue: mockTenant },
          ...EXTRA_PROVIDERS,
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
