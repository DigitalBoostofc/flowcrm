import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { Agent } from './entities/agent.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

describe('AgentsService', () => {
  let service: AgentsService;
  const mockRepo = {
    create: jest.fn().mockImplementation((d) => d),
    save: jest.fn().mockImplementation((a) => Promise.resolve({ id: 'a-1', ...a })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };
  const mockTenant = { requireWorkspaceId: jest.fn().mockReturnValue('ws-1') } as unknown as TenantContext;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: getRepositoryToken(Agent), useValue: mockRepo },
        { provide: TenantContext, useValue: mockTenant },
      ],
    }).compile();
    service = module.get(AgentsService);
  });

  describe('create', () => {
    it('cria agente com defaults sensatos quando dto é mínimo', async () => {
      const result = await service.create({ name: 'Júlia' });
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          name: 'Júlia',
          persona: 'proxima',
          model: 'claude-haiku-4-5',
          active: false,
          config: expect.objectContaining({
            maxMessagesPerConv: 5,
            cooldownSeconds: 30,
            allowedTools: expect.arrayContaining(['send_whatsapp', 'escalate_to_human']),
            escalationKeywords: expect.arrayContaining(['cancelar', 'reclamar']),
          }),
        }),
      );
      expect(result.id).toBe('a-1');
    });

    it('respeita overrides do dto', async () => {
      await service.create({
        name: 'Beto',
        persona: 'formal',
        model: 'claude-sonnet-4-6',
        maxMessagesPerConv: 10,
        cooldownSeconds: 60,
        allowedTools: ['send_whatsapp'],
        defaultPipelineB2C: '00000000-0000-0000-0000-000000000001',
        active: true,
      });
      const created = mockRepo.create.mock.calls[0][0];
      expect(created.persona).toBe('formal');
      expect(created.model).toBe('claude-sonnet-4-6');
      expect(created.config.maxMessagesPerConv).toBe(10);
      expect(created.config.cooldownSeconds).toBe(60);
      expect(created.config.allowedTools).toEqual(['send_whatsapp']);
      expect(created.config.defaultPipelineB2C).toBe('00000000-0000-0000-0000-000000000001');
      expect(created.active).toBe(true);
    });
  });

  describe('findOne', () => {
    it('lança NotFound quando agente não existe no workspace', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });

    it('escopa busca por workspaceId', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ id: 'a-1', workspaceId: 'ws-1' });
      await service.findOne('a-1');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'a-1', workspaceId: 'ws-1' } });
    });
  });

  describe('update', () => {
    it('faz merge no config preservando campos existentes', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        id: 'a-1',
        workspaceId: 'ws-1',
        name: 'old',
        persona: 'proxima',
        config: {
          enabledChannels: ['ch-1'],
          activationRules: { afterHours: true },
          allowedTools: ['send_whatsapp'],
          escalationKeywords: ['cancelar'],
          maxMessagesPerConv: 5,
          cooldownSeconds: 30,
        },
      });
      await service.update('a-1', {
        name: 'new',
        cooldownSeconds: 60,
        activationRules: { weekends: true },
      });
      const saved = mockRepo.save.mock.calls[0][0];
      expect(saved.name).toBe('new');
      expect(saved.config.enabledChannels).toEqual(['ch-1']);
      expect(saved.config.cooldownSeconds).toBe(60);
      expect(saved.config.activationRules).toEqual({ afterHours: true, weekends: true });
    });
  });

  describe('remove', () => {
    it('soft delete escopado por workspace', async () => {
      mockRepo.softDelete.mockResolvedValueOnce({ affected: 1 });
      await service.remove('a-1');
      expect(mockRepo.softDelete).toHaveBeenCalledWith({ id: 'a-1', workspaceId: 'ws-1' });
    });

    it('lança NotFound se nada afetado', async () => {
      mockRepo.softDelete.mockResolvedValueOnce({ affected: 0 });
      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });
  });
});
