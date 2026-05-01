import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnauthorizedException } from '@nestjs/common';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { ChannelsService } from '../channels.service';

describe('TelegramWebhookController', () => {
  let controller: TelegramWebhookController;
  const mockChannels = { findByIdUnscoped: jest.fn() } as unknown as ChannelsService;
  const mockEvents = { emit: jest.fn() } as unknown as EventEmitter2;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelegramWebhookController],
      providers: [
        { provide: ChannelsService, useValue: mockChannels },
        { provide: EventEmitter2, useValue: mockEvents },
      ],
    }).compile();
    controller = module.get(TelegramWebhookController);
  });

  function setChannel(overrides: Record<string, unknown> = {}) {
    (mockChannels.findByIdUnscoped as jest.Mock).mockResolvedValueOnce({
      id: 'ch-1',
      type: 'telegram',
      active: true,
      config: {},
      ...overrides,
    });
  }

  function makeUpdate(overrides: any = {}) {
    return {
      update_id: 1,
      message: {
        message_id: 99,
        from: { id: 7, first_name: 'Maria' },
        chat: { id: 7 },
        date: 1714500000,
        text: 'oi',
        ...overrides,
      },
    } as any;
  }

  it('emits message.inbound.received with normalized fields', async () => {
    setChannel();
    const result = await controller.receive('ch-1', undefined, makeUpdate());
    expect(result).toEqual({ ok: true });
    expect(mockEvents.emit).toHaveBeenCalledWith(
      'message.inbound.received',
      expect.objectContaining({
        channelType: 'telegram',
        channelConfigId: 'ch-1',
        externalMessageId: 'tg-99',
        from: '7',
        fromName: 'Maria',
        body: 'oi',
        receivedAt: expect.any(Date),
      }),
    );
  });

  it('rejects when channel does not exist or is inactive', async () => {
    (mockChannels.findByIdUnscoped as jest.Mock).mockResolvedValueOnce(null);
    await expect(controller.receive('ch-x', undefined, makeUpdate())).rejects.toThrow(UnauthorizedException);
    expect(mockEvents.emit).not.toHaveBeenCalled();
  });

  it('rejects when channel type is not telegram', async () => {
    setChannel({ type: 'meta' });
    await expect(controller.receive('ch-1', undefined, makeUpdate())).rejects.toThrow(UnauthorizedException);
  });

  it('validates secret token when configured', async () => {
    setChannel({ config: { secretToken: 'expected-secret' } });
    await expect(controller.receive('ch-1', 'wrong', makeUpdate())).rejects.toThrow(UnauthorizedException);
  });

  it('accepts matching secret token', async () => {
    setChannel({ config: { secretToken: 'sec' } });
    await expect(controller.receive('ch-1', 'sec', makeUpdate())).resolves.toEqual({ ok: true });
  });

  it('ignores updates without text (skip non-text)', async () => {
    setChannel();
    const update = { update_id: 1, message: { message_id: 99, from: { id: 7 }, chat: { id: 7 }, date: 1, /* no text */ } } as any;
    const result = await controller.receive('ch-1', undefined, update);
    expect(result).toEqual({ ok: true });
    expect(mockEvents.emit).not.toHaveBeenCalled();
  });

  it('handles update with no message at all (channel post, etc)', async () => {
    setChannel();
    const result = await controller.receive('ch-1', undefined, { update_id: 1 } as any);
    expect(result).toEqual({ ok: true });
    expect(mockEvents.emit).not.toHaveBeenCalled();
  });

  it('combines first_name + last_name for fromName', async () => {
    setChannel();
    const update = makeUpdate({ from: { id: 7, first_name: 'Maria', last_name: 'Silva' } });
    await controller.receive('ch-1', undefined, update);
    expect(mockEvents.emit).toHaveBeenCalledWith(
      'message.inbound.received',
      expect.objectContaining({ fromName: 'Maria Silva' }),
    );
  });

  it('falls back to username when first/last names are missing', async () => {
    setChannel();
    const update = makeUpdate({ from: { id: 7, username: 'maria_s' } });
    await controller.receive('ch-1', undefined, update);
    expect(mockEvents.emit).toHaveBeenCalledWith(
      'message.inbound.received',
      expect.objectContaining({ fromName: 'maria_s' }),
    );
  });
});
