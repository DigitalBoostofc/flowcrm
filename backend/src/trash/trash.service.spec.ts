import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TrashService } from './trash.service';
import { Lead } from '../leads/entities/lead.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Company } from '../companies/entities/company.entity';
import { Product } from '../products/entities/product.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

function mockRepo() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    restore: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    }),
  };
}

describe('TrashService', () => {
  let service: TrashService;
  const repos = {
    leads: mockRepo(),
    contacts: mockRepo(),
    companies: mockRepo(),
    products: mockRepo(),
  };
  const tenant = { requireWorkspaceId: () => 'ws-1' } as unknown as TenantContext;

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.values(repos).forEach((r) => {
      r.find.mockResolvedValue([]);
      r.findOne.mockReset();
      r.restore.mockResolvedValue({ affected: 1 });
      r.delete.mockResolvedValue({ affected: 1 });
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrashService,
        { provide: getRepositoryToken(Lead), useValue: repos.leads },
        { provide: getRepositoryToken(Contact), useValue: repos.contacts },
        { provide: getRepositoryToken(Company), useValue: repos.companies },
        { provide: getRepositoryToken(Product), useValue: repos.products },
        { provide: TenantContext, useValue: tenant },
      ],
    }).compile();
    service = module.get(TrashService);
  });

  it('rejects unknown trash type', async () => {
    await expect((service as any).list('foo', 30)).rejects.toThrow(BadRequestException);
  });

  it('lists items and computes daysUntilPurge', async () => {
    const oneDayAgo = new Date(Date.now() - 86_400_000);
    repos.leads.find.mockResolvedValueOnce([
      { id: 'lead-1', title: 'Acme', deletedAt: oneDayAgo },
    ]);
    const items = await service.list('leads', 30);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'leads', id: 'lead-1', label: 'Acme' });
    expect(items[0].daysUntilPurge).toBe(29);
  });

  it('clamps daysUntilPurge to 0 for ancient items', async () => {
    repos.contacts.find.mockResolvedValueOnce([
      { id: 'c-1', name: 'João', deletedAt: new Date(Date.now() - 100 * 86_400_000) },
    ]);
    const items = await service.list('contacts', 30);
    expect(items[0].daysUntilPurge).toBe(0);
  });

  it('restore() throws NotFoundException when nothing matched', async () => {
    repos.leads.restore.mockResolvedValueOnce({ affected: 0 });
    await expect(service.restore('leads', 'nope')).rejects.toThrow(NotFoundException);
  });

  it('purgeOne() refuses if item is not actually in the trash', async () => {
    repos.products.findOne.mockResolvedValueOnce(null);
    await expect(service.purgeOne('products', 'p-1')).rejects.toThrow(NotFoundException);
    expect(repos.products.delete).not.toHaveBeenCalled();
  });

  it('purgeOne() hard-deletes when found', async () => {
    repos.companies.findOne.mockResolvedValueOnce({ id: 'co-1' });
    await service.purgeOne('companies', 'co-1');
    expect(repos.companies.delete).toHaveBeenCalledWith({ id: 'co-1', workspaceId: 'ws-1' });
  });

  it('purgeOlderThan returns affected counts per type', async () => {
    repos.leads.createQueryBuilder().execute.mockResolvedValueOnce({ affected: 3 });
    repos.contacts.createQueryBuilder().execute.mockResolvedValueOnce({ affected: 1 });
    const out = await service.purgeOlderThan(30);
    expect(out).toEqual(expect.objectContaining({ leads: expect.any(Number), contacts: expect.any(Number) }));
  });
});
