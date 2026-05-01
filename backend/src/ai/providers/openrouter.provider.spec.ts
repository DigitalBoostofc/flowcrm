import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { OpenRouterProvider } from './openrouter.provider';

jest.mock('axios');

describe('OpenRouterProvider', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const post = jest.fn();
  const config: Record<string, string | undefined> = {};

  let provider: OpenRouterProvider;

  beforeEach(async () => {
    jest.clearAllMocks();
    config.OPENROUTER_API_KEY = 'sk-test';
    config.AI_MODEL_SUMMARY = 'google/gemini-2.5-flash-lite';
    config.FRONTEND_URL = 'https://flowcrm.app';
    mockedAxios.create.mockReturnValue({ post } as unknown as ReturnType<typeof axios.create>);
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockImplementation(() => false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenRouterProvider,
        { provide: ConfigService, useValue: { get: (k: string) => config[k] } },
      ],
    }).compile();
    provider = module.get(OpenRouterProvider);
  });

  it('throws ServiceUnavailable when API key is missing', async () => {
    config.OPENROUTER_API_KEY = '';
    await expect(provider.complete({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('sends OpenAI-compatible payload with model from env and parses response', async () => {
    post.mockResolvedValueOnce({
      data: {
        model: 'google/gemini-2.5-flash-lite',
        choices: [{ message: { content: '  Resumo curto  ' } }],
        usage: { prompt_tokens: 120, completion_tokens: 40, total_tokens: 160 },
      },
    });

    const out = await provider.complete({ systemPrompt: 'sys', userPrompt: 'usr' });

    expect(post).toHaveBeenCalledWith(
      '/chat/completions',
      expect.objectContaining({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'usr' },
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
      expect.objectContaining({ headers: { Authorization: 'Bearer sk-test' } }),
    );
    expect(out.text).toBe('Resumo curto');
    expect(out.model).toBe('google/gemini-2.5-flash-lite');
    expect(out.usage).toEqual({ inputTokens: 120, outputTokens: 40, totalTokens: 160 });
  });

  it('honors per-call model and maxOutputTokens overrides', async () => {
    post.mockResolvedValueOnce({
      data: {
        model: 'meta-llama/llama-3.1-8b-instruct',
        choices: [{ message: { content: 'ok' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      },
    });

    await provider.complete({
      systemPrompt: 's',
      userPrompt: 'u',
      model: 'meta-llama/llama-3.1-8b-instruct',
      maxOutputTokens: 80,
      temperature: 0.7,
    });

    expect(post).toHaveBeenCalledWith(
      '/chat/completions',
      expect.objectContaining({
        model: 'meta-llama/llama-3.1-8b-instruct',
        max_tokens: 80,
        temperature: 0.7,
      }),
      expect.any(Object),
    );
  });

  it('throws ServiceUnavailable on empty content', async () => {
    post.mockResolvedValueOnce({
      data: {
        model: 'google/gemini-2.5-flash-lite',
        choices: [{ message: { content: '' } }],
        usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
      },
    });
    await expect(provider.complete({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('translates HTTP failure into ServiceUnavailable', async () => {
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockImplementation(() => true);
    post.mockRejectedValueOnce({ response: { status: 502, data: { error: 'bad gateway' } }, message: 'fail' });
    await expect(provider.complete({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
