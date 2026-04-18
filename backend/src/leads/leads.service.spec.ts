import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('LeadsService', () => {
  let service: LeadsService;
  const mockLead = { id: 'lead-1', stageId: 'stage-1', contactId: 'c-1', pipelineId: 'p-1' };
  const mockRepo = {
    findOne: jest.fn().mockResolvedValue({ ...mockLead }),
    find: jest.fn().mockResolvedValue([mockLead]),
    create: jest.fn().mockImplementation((d) => d),
    save: jest.fn().mockImplementation((l) => Promise.resolve({ id: 'lead-1', ...l })),
  };
  const mockEmitter = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo.findOne.mockResolvedValue({ ...mockLead });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: getRepositoryToken(Lead), useValue: mockRepo },
        { provide: EventEmitter2, useValue: mockEmitter },
      ],
    }).compile();
    service = module.get<LeadsService>(LeadsService);
  });

  it('moves lead to new stage and emits event', async () => {
    const result = await service.move('lead-1', 'stage-2');
    expect(result.stageId).toBe('stage-2');
    expect(mockEmitter.emit).toHaveBeenCalledWith('lead.moved', expect.objectContaining({ newStageId: 'stage-2' }));
  });

  it('creates a lead', async () => {
    const dto = { contactId: 'c-1', pipelineId: 'p-1', stageId: 's-1' };
    mockRepo.create.mockReturnValueOnce(dto);
    const lead = await service.create(dto);
    expect(lead.id).toBe('lead-1');
  });
});
