import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { Stage } from '../stages/entities/stage.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { UserRole } from '../users/entities/user.entity';
import { LeadScoringService } from './scoring/lead-scoring.service';

describe('LeadsService', () => {
  let service: LeadsService;
  const mockLead = {
    id: 'lead-1',
    workspaceId: 'ws-1',
    stageId: 'stage-1',
    contactId: 'c-1',
    pipelineId: 'p-1',
    privacy: 'all',
    createdById: null,
    assignedToId: null,
    additionalAccessUserIds: [],
  };
  const mockRepo = {
    findOne: jest.fn().mockResolvedValue({ ...mockLead }),
    find: jest.fn().mockResolvedValue([mockLead]),
    create: jest.fn().mockImplementation((d) => d),
    save: jest.fn().mockImplementation((l) => Promise.resolve({ id: 'lead-1', ...l })),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const mockStageRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 'stage-2', pipelineId: 'p-1' }),
  };
  const mockContactRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((d) => d),
    save: jest.fn().mockImplementation((c) => Promise.resolve({ id: 'c-1', ...c })),
  };
  const mockEmitter = { emit: jest.fn() };
  const mockTenant = { requireWorkspaceId: jest.fn().mockReturnValue('ws-1') } as unknown as TenantContext;
  const mockScoring = {
    calculate: jest.fn().mockReturnValue({ score: 73, factors: { base: 50, value: 15, ranking: 0, freshness: 10, status: 0 } }),
  } as unknown as LeadScoringService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo.findOne.mockResolvedValue({ ...mockLead });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: getRepositoryToken(Lead), useValue: mockRepo },
        { provide: getRepositoryToken(Stage), useValue: mockStageRepo },
        { provide: getRepositoryToken(Contact), useValue: mockContactRepo },
        { provide: EventEmitter2, useValue: mockEmitter },
        { provide: TenantContext, useValue: mockTenant },
        { provide: LeadScoringService, useValue: mockScoring },
      ],
    }).compile();
    service = module.get<LeadsService>(LeadsService);
  });

  it('moves lead to new stage and emits event', async () => {
    mockRepo.findOne.mockResolvedValue({ ...mockLead, stageId: 'stage-2' });
    const result = await service.move('lead-1', 'stage-2', 'user-1', UserRole.OWNER);
    expect(result.stageId).toBe('stage-2');
    expect(mockEmitter.emit).toHaveBeenCalledWith(
      'lead.moved',
      expect.objectContaining({ newStageId: 'stage-2', workspaceId: 'ws-1' }),
    );
  });

  it('creates a lead', async () => {
    const dto = { contactId: 'c-1', pipelineId: 'p-1', stageId: 's-1' };
    mockRepo.create.mockReturnValueOnce(dto);
    const lead = await service.create(dto);
    expect(lead.id).toBe('lead-1');
  });

  describe('setScore', () => {
    it('persists score after privacy check', async () => {
      const result = await service.setScore('lead-1', 80, 'user-1', UserRole.OWNER);
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ score: 80 }));
      expect(result.score).toBe(80);
    });
  });

  describe('recalculateScore', () => {
    it('runs scoring service and persists computed score', async () => {
      const out = await service.recalculateScore('lead-1', 'user-1', UserRole.OWNER);
      expect(mockScoring.calculate).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ score: 73 }));
      expect(out.result.score).toBe(73);
      expect(out.result.factors).toEqual({ base: 50, value: 15, ranking: 0, freshness: 10, status: 0 });
    });
  });
});
