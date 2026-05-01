import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { AiSettingsService } from './ai-settings.service';
import { WorkspaceAiSettings } from './entities/workspace-ai-settings.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { SecretCryptoService } from '../common/crypto/secret-crypto.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AiSettingsService', () => {
  let service: AiSettingsService;
  const ENTITY_DEFAULTS = {
    provider: 'anthropic',
    keySource: 'platform',
    apiKeyEncrypted: null,
    apiKeyLast4: null,
    defaultModel: 'claude-haiku-4-5',
    monthlyTokenBudget: null,
    tokensUsedThisMonth: 0,
    lastValidatedAt: null,
    enabled: false,
  };
  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((d) => ({ ...ENTITY_DEFAULTS, ...d })),
    save: jest.fn().mockImplementation((s) => Promise.resolve({ id: 's-1', ...s })),
  };
  const mockTenant = { requireWorkspaceId: jest.fn().mockReturnValue('ws-1') } as unknown as TenantContext;
  const mockCrypto = {
    encrypt: jest.fn().mockReturnValue('v1:aa:bb:cc'),
    decrypt: jest.fn().mockReturnValue('sk-ant-decrypted'),
  } as unknown as SecretCryptoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSettingsService,
        { provide: getRepositoryToken(WorkspaceAiSettings), useValue: mockRepo },
        { provide: TenantContext, useValue: mockTenant },
        { provide: SecretCryptoService, useValue: mockCrypto },
      ],
    }).compile();
    service = module.get(AiSettingsService);
  });

  describe('getView', () => {
    it('cria settings na primeira chamada e retorna view sem expor key', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      const view = await service.getView();
      expect(mockRepo.create).toHaveBeenCalledWith({ workspaceId: 'ws-1' });
      expect(view).toEqual(
        expect.objectContaining({
          provider: 'anthropic',
          keySource: 'platform',
          apiKeyMasked: null,
          enabled: false,
        }),
      );
    });

    it('mascara apiKey baseado nos last4', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        id: 's-1', workspaceId: 'ws-1', provider: 'anthropic', keySource: 'byo',
        apiKeyEncrypted: 'enc', apiKeyLast4: '1234', defaultModel: 'claude-haiku-4-5',
        monthlyTokenBudget: null, tokensUsedThisMonth: 0, lastValidatedAt: null, enabled: true,
      });
      const view = await service.getView();
      expect(view.apiKeyMasked).toBe(`${'•'.repeat(20)}1234`);
    });
  });

  describe('update', () => {
    it('encripta apiKey quando fornecida com keySource=byo', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        id: 's-1', workspaceId: 'ws-1', provider: 'anthropic', keySource: 'platform',
        apiKeyEncrypted: null, apiKeyLast4: null, defaultModel: 'claude-haiku-4-5',
        monthlyTokenBudget: null, tokensUsedThisMonth: 0, lastValidatedAt: null, enabled: false,
      });
      await service.update({ keySource: 'byo', apiKey: 'sk-ant-api03-AbCdEfGhIjKlMnOp1234' });
      expect(mockCrypto.encrypt).toHaveBeenCalledWith('sk-ant-api03-AbCdEfGhIjKlMnOp1234');
      const saved = mockRepo.save.mock.calls[0][0];
      expect(saved.apiKeyEncrypted).toBe('v1:aa:bb:cc');
      expect(saved.apiKeyLast4).toBe('1234');
      expect(saved.lastValidatedAt).toBeNull();
    });

    it('rejeita apiKey sem keySource=byo (e settings ainda em platform)', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        id: 's-1', workspaceId: 'ws-1', provider: 'anthropic', keySource: 'platform',
        apiKeyEncrypted: null, apiKeyLast4: null, defaultModel: 'claude-haiku-4-5',
        monthlyTokenBudget: null, tokensUsedThisMonth: 0, lastValidatedAt: null, enabled: false,
      });
      await expect(
        service.update({ apiKey: 'sk-ant-zzz' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('atualiza enabled e monthlyTokenBudget independente da key', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        id: 's-1', workspaceId: 'ws-1', provider: 'anthropic', keySource: 'platform',
        apiKeyEncrypted: null, apiKeyLast4: null, defaultModel: 'claude-haiku-4-5',
        monthlyTokenBudget: null, tokensUsedThisMonth: 0, lastValidatedAt: null, enabled: false,
      });
      await service.update({ enabled: true, monthlyTokenBudget: 100000 });
      const saved = mockRepo.save.mock.calls[0][0];
      expect(saved.enabled).toBe(true);
      expect(saved.monthlyTokenBudget).toBe(100000);
    });
  });

  describe('validate', () => {
    it('retorna ok=false quando byo sem apiKeyEncrypted', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        id: 's-1', workspaceId: 'ws-1', keySource: 'byo', apiKeyEncrypted: null,
        defaultModel: 'claude-haiku-4-5',
      });
      const result = await service.validate();
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Nenhuma API key/);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('chama Anthropic API e marca lastValidatedAt em sucesso', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        id: 's-1', workspaceId: 'ws-1', keySource: 'byo', apiKeyEncrypted: 'enc',
        defaultModel: 'claude-haiku-4-5',
      });
      mockedAxios.post.mockResolvedValueOnce({ data: { content: [{ type: 'text', text: 'ok' }] } });
      const result = await service.validate();
      expect(result.ok).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({ model: 'claude-haiku-4-5', max_tokens: 1 }),
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-api-key': 'sk-ant-decrypted' }),
        }),
      );
      const saved = mockRepo.save.mock.calls[0][0];
      expect(saved.lastValidatedAt).toBeInstanceOf(Date);
    });

    it('retorna ok=false com mensagem da API em falha 4xx', async () => {
      mockRepo.findOne.mockResolvedValueOnce({
        id: 's-1', workspaceId: 'ws-1', keySource: 'byo', apiKeyEncrypted: 'enc',
        defaultModel: 'claude-haiku-4-5',
      });
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 401, data: { error: { message: 'invalid x-api-key' } } },
        message: 'Request failed with status code 401',
      });
      const result = await service.validate();
      expect(result.ok).toBe(false);
      expect(result.error).toBe('invalid x-api-key');
    });

    it('usa ANTHROPIC_API_KEY env quando keySource=platform', async () => {
      const original = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = 'platform-key';
      mockRepo.findOne.mockResolvedValueOnce({
        id: 's-1', workspaceId: 'ws-1', keySource: 'platform', apiKeyEncrypted: null,
        defaultModel: 'claude-haiku-4-5',
      });
      mockedAxios.post.mockResolvedValueOnce({ data: {} });
      const result = await service.validate();
      expect(result.ok).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-api-key': 'platform-key' }),
        }),
      );
      process.env.ANTHROPIC_API_KEY = original;
    });
  });
});
