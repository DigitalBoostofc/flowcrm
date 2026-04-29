import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { MeService } from './me.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Company } from '../companies/entities/company.entity';
import { Product } from '../products/entities/product.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

describe('MeService', () => {
  let service: MeService;
  const users = { findOne: jest.fn(), update: jest.fn(), count: jest.fn() };
  const workspaces = { findOne: jest.fn() };
  const repoFind = () => ({ find: jest.fn().mockResolvedValue([]) });
  const leads = repoFind();
  const contacts = repoFind();
  const companies = repoFind();
  const products = repoFind();
  const tenant = { requireWorkspaceId: () => 'ws-1' } as unknown as TenantContext;
  const config = {
    get: jest.fn((k: string, d?: any) => (k === 'ACCOUNT_RETENTION_DAYS' ? 30 : d)),
  } as unknown as ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
    users.findOne.mockReset();
    users.update.mockResolvedValue({ affected: 1 });
    users.count.mockReset();
    leads.find.mockResolvedValue([]);
    workspaces.findOne.mockResolvedValue({ id: 'ws-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(Workspace), useValue: workspaces },
        { provide: getRepositoryToken(Lead), useValue: leads },
        { provide: getRepositoryToken(Contact), useValue: contacts },
        { provide: getRepositoryToken(Company), useValue: companies },
        { provide: getRepositoryToken(Product), useValue: products },
        { provide: TenantContext, useValue: tenant },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get(MeService);
  });

  describe('exportData', () => {
    it('returns user (without passwordHash) + workspace + collections', async () => {
      users.findOne.mockResolvedValueOnce({
        id: 'u-1',
        workspaceId: 'ws-1',
        email: 'a@b.com',
        passwordHash: 'secret-hash',
      });
      const out = await service.exportData('u-1');
      expect(out.user.email).toBe('a@b.com');
      expect((out.user as any).passwordHash).toBeUndefined();
      expect(out.workspace).toEqual({ id: 'ws-1' });
      expect(Array.isArray(out.leads)).toBe(true);
    });

    it('throws NotFound when user does not exist', async () => {
      users.findOne.mockResolvedValueOnce(null);
      await expect(service.exportData('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  describe('scheduleAccountDeletion', () => {
    it('blocks owner if there are other users in the workspace', async () => {
      users.findOne.mockResolvedValueOnce({ id: 'u-1', role: UserRole.OWNER, workspaceId: 'ws-1' });
      users.count.mockResolvedValueOnce(3);
      await expect(service.scheduleAccountDeletion('u-1')).rejects.toThrow(ConflictException);
    });

    it('allows owner if they are the sole user', async () => {
      users.findOne.mockResolvedValueOnce({ id: 'u-1', role: UserRole.OWNER, workspaceId: 'ws-1' });
      users.count.mockResolvedValueOnce(1);
      const out = await service.scheduleAccountDeletion('u-1');
      expect(out.scheduledDeletionAt).toBeInstanceOf(Date);
      expect(users.update).toHaveBeenCalledWith('u-1', expect.objectContaining({ scheduledDeletionAt: expect.any(Date) }));
    });

    it('allows non-owner without checks', async () => {
      users.findOne.mockResolvedValueOnce({ id: 'u-2', role: UserRole.SELLER, workspaceId: 'ws-1' });
      const out = await service.scheduleAccountDeletion('u-2');
      expect(out.scheduledDeletionAt).toBeInstanceOf(Date);
      expect(users.count).not.toHaveBeenCalled();
    });
  });

  describe('cancelAccountDeletion', () => {
    it('clears the scheduledDeletionAt', async () => {
      users.findOne.mockResolvedValueOnce({ id: 'u-1', scheduledDeletionAt: new Date() });
      await service.cancelAccountDeletion('u-1');
      expect(users.update).toHaveBeenCalledWith('u-1', { scheduledDeletionAt: null });
    });

    it('errors if account is not in deletion state', async () => {
      users.findOne.mockResolvedValueOnce({ id: 'u-1', scheduledDeletionAt: null });
      await expect(service.cancelAccountDeletion('u-1')).rejects.toThrow(BadRequestException);
    });
  });
});
