import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessagesService, SaveInboundData } from './messages.service';
import { Message } from './entities/message.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

const WS_ID = 'ws-test';
const CONV_ID = 'conv-1';
const EXT_ID = 'ext-abc';
const mockTenant = { requireWorkspaceId: jest.fn().mockReturnValue(WS_ID) } as unknown as TenantContext;

function makeUpdateQb(result: { affected: number; raw: object[] }) {
  return {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(result),
  };
}

function makeInsertQb(result: { raw: object[] }) {
  return {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(result),
  };
}

describe('MessagesService.saveWebhookOutbound', () => {
  let service: MessagesService;
  const mockRepo = { createQueryBuilder: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockTenant.requireWorkspaceId = jest.fn().mockReturnValue(WS_ID);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getRepositoryToken(Message), useValue: mockRepo },
        { provide: TenantContext, useValue: mockTenant },
      ],
    }).compile();
    service = module.get<MessagesService>(MessagesService);
  });

  const baseData = (): SaveInboundData => ({
    conversationId: CONV_ID,
    externalMessageId: EXT_ID,
    body: 'olá',
    sentAt: new Date(),
  });

  it('Cenário 1 — Rajada normal: UPDATE encontra placeholder e retorna a linha sem INSERT', async () => {
    const mockMsg = { id: 'msg-1', body: 'olá', externalMessageId: EXT_ID };
    const updateQb = makeUpdateQb({ affected: 1, raw: [mockMsg] });
    const insertQb = makeInsertQb({ raw: [] });

    mockRepo.createQueryBuilder
      .mockReturnValueOnce(updateQb)
      .mockReturnValueOnce(insertQb);

    const result = await service.saveWebhookOutbound(baseData());

    expect(result).toEqual(mockMsg);
    expect(updateQb.execute).toHaveBeenCalledTimes(1);
    expect(insertQb.execute).not.toHaveBeenCalled();
  });

  it('Cenário 2 — Mídia sem caption: body vazio + mediaUrl → usa mediaUrl no match', async () => {
    const mediaUrl = 'https://cdn.example.com/img.jpg';
    const mockMsg = { id: 'msg-2', body: '', mediaUrl, externalMessageId: EXT_ID };
    const updateQb = makeUpdateQb({ affected: 1, raw: [mockMsg] });

    mockRepo.createQueryBuilder.mockReturnValueOnce(updateQb);

    const data: SaveInboundData = { ...baseData(), body: '', mediaUrl };
    const result = await service.saveWebhookOutbound(data);

    expect(result).toEqual(mockMsg);

    const andWhereCalls: [string, object][] = updateQb.andWhere.mock.calls;
    const mediaUrlCall = andWhereCalls.find(([sql]) => sql.includes('mediaUrl'));
    expect(mediaUrlCall).toBeDefined();
    expect(mediaUrlCall![1]).toMatchObject({ mediaUrl });
  });

  it('Cenário 3 — Webhook tardio: UPDATE não encontra nada, INSERT é executado', async () => {
    const mockMsg = { id: 'msg-3', body: 'olá', externalMessageId: EXT_ID };
    const updateQb = makeUpdateQb({ affected: 0, raw: [] });
    const insertQb = makeInsertQb({ raw: [mockMsg] });

    mockRepo.createQueryBuilder
      .mockReturnValueOnce(updateQb)
      .mockReturnValueOnce(insertQb);

    const result = await service.saveWebhookOutbound(baseData());

    expect(result).toEqual(mockMsg);
    expect(updateQb.execute).toHaveBeenCalledTimes(1);
    expect(insertQb.execute).toHaveBeenCalledTimes(1);
  });
});
