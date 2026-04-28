import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  const mockRepo = {
    insert: jest.fn().mockResolvedValue({ identifiers: [{ id: 'audit-1' }], generatedMaps: [], raw: [] }),
    delete: jest.fn().mockResolvedValue({ affected: 0, raw: [] }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: getRepositoryToken(AuditLog), useValue: mockRepo }],
    }).compile();
    service = module.get<AuditService>(AuditService);
  });

  it('records a basic event', async () => {
    await service.record({ action: 'lead.create', userId: 'u-1', workspaceId: 'ws-1' });
    expect(mockRepo.insert).toHaveBeenCalledTimes(1);
    const arg = mockRepo.insert.mock.calls[0][0];
    expect(arg.action).toBe('lead.create');
    expect(arg.userId).toBe('u-1');
    expect(arg.workspaceId).toBe('ws-1');
    expect(arg.changes).toBeNull();
  });

  it('redacts sensitive fields in changes', async () => {
    await service.record({
      action: 'user.update',
      changes: {
        email: 'a@b.com',
        password: 'hunter2',
        passwordHash: '$2b$10$xyz',
        nested: { apiKey: 'sk-secret', name: 'ok' },
      },
    });
    const arg = mockRepo.insert.mock.calls[0][0];
    expect(arg.changes.email).toBe('a@b.com');
    expect(arg.changes.password).toBe('[REDACTED]');
    expect(arg.changes.passwordHash).toBe('[REDACTED]');
    expect(arg.changes.nested.apiKey).toBe('[REDACTED]');
    expect(arg.changes.nested.name).toBe('ok');
  });

  it('truncates long user agents', async () => {
    const longUa = 'A'.repeat(800);
    await service.record({ action: 'login', userAgent: longUa });
    const arg = mockRepo.insert.mock.calls[0][0];
    expect(arg.userAgent.length).toBe(500);
  });

  it('swallows insert errors so the request keeps flowing', async () => {
    mockRepo.insert.mockRejectedValueOnce(new Error('boom'));
    await expect(service.record({ action: 'x' })).resolves.toBeUndefined();
  });
});
