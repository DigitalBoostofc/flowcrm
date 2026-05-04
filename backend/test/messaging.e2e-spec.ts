import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ChannelsService } from '../src/channels/channels.service';
import { InboundListener } from '../src/channels/inbound.listener';

// We deliberately do NOT override BullMQ queue tokens. The previous version
// used overrideProvider(getQueueToken('automation')).useValue(mockQueue) which
// confuses the BullExplorer at app.init() — @Processor() workers fail with
// "Worker requires a connection". Instead: let BullMQ talk to the real Redis
// available in CI, mock only ChannelsService.send (the network egress), and
// validate side effects through DB queries (more robust than REST polling
// which depends on DTO/endpoint shapes that drift between phases).
describe('Messaging Pipeline (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let inboundListener: InboundListener;
  let ownerToken: string;
  let pipelineId: string;
  let stage1Id: string;
  let stage2Id: string;
  let channelConfigId: string;
  let templateId: string;

  const mockChannelSend = jest
    .fn()
    .mockResolvedValue({ externalMessageId: 'sent-123', status: 'sent' });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    app.setGlobalPrefix('api');
    await app.init();

    dataSource = app.get<DataSource>(getDataSourceToken());

    const channels = app.get(ChannelsService);
    channels.send = mockChannelSend;

    inboundListener = app.get(InboundListener);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'owner@flowcrm.com', password: 'flowcrm123' });
    ownerToken = loginRes.body.accessToken;

    const pipelineRes = await request(app.getHttpServer())
      .post('/api/pipelines')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Vendas Test', isDefault: true });
    pipelineId = pipelineRes.body.id;

    const s1 = await request(app.getHttpServer())
      .post(`/api/pipelines/${pipelineId}/stages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Qualificação Test', position: 0 });
    stage1Id = s1.body.id;

    const s2 = await request(app.getHttpServer())
      .post(`/api/pipelines/${pipelineId}/stages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Proposta Test', position: 1 });
    stage2Id = s2.body.id;

    const channelRes = await request(app.getHttpServer())
      .post('/api/channels')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Evo Test',
        type: 'evolution',
        config: { instance: 'test-inst', apiKey: 'test-key', webhookSecret: 'test-secret' },
      });
    channelConfigId = channelRes.body.id;

    const templateRes = await request(app.getHttpServer())
      .post('/api/templates')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Boas-vindas Test', body: 'Olá {nome}!' });
    templateId = templateRes.body.id;
  });

  afterAll(async () => {
    await request(app.getHttpServer())
      .delete(`/api/pipelines/${pipelineId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    await app.close();
  });

  // Helper: find an unqualified conversation by externalId (phone).
  // Since inbound no longer auto-creates leads, conversations have leadId = null.
  async function findConversationByExternalId(externalId: string): Promise<{ id: string; leadId: string | null } | null> {
    const rows: { id: string; leadId: string | null }[] = await dataSource.query(
      'SELECT id, "leadId" FROM conversations WHERE "externalId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
      [externalId],
    );
    return rows[0] ?? null;
  }

  it('inbound webhook creates an unqualified conversation (no lead) and saves the message', async () => {
    const phone = '+5511987654321';
    await inboundListener.handle({
      channelType: 'evolution',
      channelConfigId,
      externalMessageId: 'evo-msg-001',
      from: phone,
      fromName: 'João Test',
      body: 'Olá, tenho interesse',
      receivedAt: new Date(),
    });

    const conv = await findConversationByExternalId(phone);
    expect(conv).not.toBeNull();
    // leadId must be null — no automatic lead creation
    expect(conv!.leadId).toBeNull();

    // Message saved under the conversation
    const msgs: { count: string }[] = await dataSource.query(
      'SELECT COUNT(*)::text AS count FROM messages WHERE "conversationId" = $1',
      [conv!.id],
    );
    expect(parseInt(msgs[0].count, 10)).toBeGreaterThanOrEqual(1);

    // No lead was created for this phone
    const leads: { count: string }[] = await dataSource.query(
      'SELECT COUNT(*)::text AS count FROM leads WHERE "externalPhone" = $1',
      [phone],
    );
    expect(parseInt(leads[0].count, 10)).toBe(0);
  });

  it('duplicate webhook (same externalMessageId) does NOT create a duplicate message', async () => {
    const phone = '+5511987654322';
    const externalId = 'evo-msg-dup-001';

    await inboundListener.handle({
      channelType: 'evolution',
      channelConfigId,
      externalMessageId: externalId,
      from: phone,
      fromName: 'Maria Dup',
      body: 'First message',
      receivedAt: new Date(),
    });

    await inboundListener.handle({
      channelType: 'evolution',
      channelConfigId,
      externalMessageId: externalId,
      from: phone,
      fromName: 'Maria Dup',
      body: 'First message',
      receivedAt: new Date(),
    });

    // Validate via DB — count messages with this externalMessageId.
    // The deduplication is enforced by a UNIQUE index on externalMessageId
    // (saveInbound returns null on conflict).
    const result: { count: string }[] = await dataSource.query(
      'SELECT COUNT(*)::text AS count FROM messages WHERE "externalMessageId" = $1',
      [externalId],
    );
    expect(parseInt(result[0].count, 10)).toBe(1);
  });

  it('automation fires once; moving back and forth does NOT re-fire', async () => {
    const automationRes = await request(app.getHttpServer())
      .post('/api/automations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Auto Stage 2 Test',
        triggerType: 'stage',
        stageId: stage2Id,
        steps: [
          {
            position: 0,
            type: 'send_whatsapp',
            config: { channelConfigId, templateId },
          },
        ],
      })
      .expect(201);
    const automationId = automationRes.body.id;

    // Create contact + lead directly via API (inbound no longer auto-creates leads)
    const contactRes = await request(app.getHttpServer())
      .post('/api/contacts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Carlos Auto', phone: '+5511987654323' })
      .expect(201);

    const leadRes = await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ contactId: contactRes.body.id, pipelineId, stageId: stage1Id })
      .expect(201);
    const leadId = leadRes.body.id;

    // 1st move: stage1 → stage2 (creates execution)
    await request(app.getHttpServer())
      .patch(`/api/leads/${leadId}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ stageId: stage2Id })
      .expect(200);

    // 2nd: back to stage1
    await request(app.getHttpServer())
      .patch(`/api/leads/${leadId}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ stageId: stage1Id })
      .expect(200);

    // 3rd: stage1 → stage2 again (must NOT create another execution due to
    // UNIQUE(automationId, leadId) on automation_executions)
    await request(app.getHttpServer())
      .patch(`/api/leads/${leadId}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ stageId: stage2Id })
      .expect(200);

    // Async OnEvent listeners need a beat to settle.
    await new Promise((r) => setTimeout(r, 800));

    const result: { count: string }[] = await dataSource.query(
      'SELECT COUNT(*)::text AS count FROM automation_executions WHERE "automationId" = $1 AND "leadId" = $2',
      [automationId, leadId],
    );
    expect(parseInt(result[0].count, 10)).toBe(1);
  });
});
