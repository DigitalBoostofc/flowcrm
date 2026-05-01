import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import axios from 'axios';
import { TelegramAdapter } from './telegram.adapter';
import { ChannelConfig } from '../entities/channel-config.entity';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TelegramAdapter', () => {
  let adapter: TelegramAdapter;
  const mockRepo = { findOneByOrFail: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramAdapter,
        { provide: getRepositoryToken(ChannelConfig), useValue: mockRepo },
      ],
    }).compile();
    adapter = module.get(TelegramAdapter);
  });

  it('declares type telegram', () => {
    expect(adapter.type).toBe('telegram');
  });

  it('sends message via Bot API and returns externalMessageId', async () => {
    mockRepo.findOneByOrFail.mockResolvedValueOnce({
      id: 'ch-1',
      config: { botToken: 'TEST_TOKEN' },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { ok: true, result: { message_id: 42 } } });

    const result = await adapter.sendMessage({ channelConfigId: 'ch-1', to: '12345', body: 'hi' });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.telegram.org/botTEST_TOKEN/sendMessage',
      { chat_id: '12345', text: 'hi' },
      expect.objectContaining({ timeout: 15000 }),
    );
    expect(result.status).toBe('sent');
    expect(result.externalMessageId).toBe('tg-42');
  });

  it('returns failed when botToken missing', async () => {
    mockRepo.findOneByOrFail.mockResolvedValueOnce({ id: 'ch-1', config: {} });
    const result = await adapter.sendMessage({ channelConfigId: 'ch-1', to: '12345', body: 'hi' });
    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/botToken/);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('returns failed with API error description on Bot API failure', async () => {
    mockRepo.findOneByOrFail.mockResolvedValueOnce({
      id: 'ch-1',
      config: { botToken: 'TEST_TOKEN' },
    });
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { description: 'Bad Request: chat not found' } },
      message: 'request failed',
    });
    const result = await adapter.sendMessage({ channelConfigId: 'ch-1', to: 'bad', body: 'hi' });
    expect(result.status).toBe('failed');
    expect(result.error).toBe('Bad Request: chat not found');
  });

  it('falls back to timestamp when Bot API result has no message_id', async () => {
    mockRepo.findOneByOrFail.mockResolvedValueOnce({
      id: 'ch-1',
      config: { botToken: 'TEST_TOKEN' },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { ok: true, result: {} } });
    const result = await adapter.sendMessage({ channelConfigId: 'ch-1', to: '12345', body: 'hi' });
    expect(result.status).toBe('sent');
    expect(result.externalMessageId).toMatch(/^tg-\d+$/);
  });
});
