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
// validate side effects through DB queries.
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

    // Replace channel send with mock so worker doesn't hit Evolution/Uazapi.
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

  it('inbound webhook creates contact + lead + conversation + message', async () => {
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

    const contactsRes = await request(app.getHttpServer())
      .get('/api/contacts?search=' + encodeURIComponent(phone))
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(contactsRes.body.length).toBeGreaterThan(0);
    const contactId = contactsRes.body[0].id;

    const leadsRes = await request(app.getHttpServer())
      .get(`/api/leads?pipelineId=${pipelineId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const lead = leadsRes.body.find((l: any) => l.contactId === contactId);
    expect(lead).toBeDefined();
    expect(lead.stageId).toBe(stage1Id);
  });

  it('duplicate webhook does NOT create duplicate message', async () => {
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

    const contactsRes = await request(app.getHttpServer())
      .get('/api/contacts?search=' + encodeURIComponent(phone))
      .set('Authorization', `Bearer ${ownerToken}`);
    const contactId = contactsRes.body[0].id;
    const leadsRes = await request(app.getHttpServer())
      .get(`/api/leads?pipelineId=${pipelineId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const lead = leadsRes.body.find((l: any) => l.contactId === contactId);

    const convRes = await request(app.getHttpServer())
      .get(`/api/conversations?leadId=${lead.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const conversation = convRes.body[0];

    const msgsRes = await request(app.getHttpServer())
      .get(`/api/messages?conversationId=${conversation.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(msgsRes.body.length).toBe(1);
  });

  it('automation fires once; moving back and forth does NOT re-fire', async () => {
    const automationRes = await request(app.getHttpServer())
      .post('/api/automations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        stageId: stage2Id,
        delayMinutes: 0,
        channelType: 'evolution',
        channelConfigId,
        templateId,
      })
      .expect(201);
    const automationId = automationRes.body.id;

    const phone = '+5511987654323';
    await inboundListener.handle({
      channelType: 'evolution',
      channelConfigId,
      externalMessageId: 'evo-msg-auto-001',
      from: phone,
      fromName: 'Carlos Auto',
      body: 'Interesse',
      receivedAt: new Date(),
    });

    const contactsRes = await request(app.getHttpServer())
      .get('/api/contacts?search=' + encodeURIComponent(phone))
      .set('Authorization', `Bearer ${ownerToken}`);
    const contactId = contactsRes.body[0].id;
    const leadsRes = await request(app.getHttpServer())
      .get(`/api/leads?pipelineId=${pipelineId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const lead = leadsRes.body.find((l: any) => l.contactId === contactId);

    // 1st move: stage1 → stage2 (creates execution)
    await request(app.getHttpServer())
      .patch(`/api/leads/${lead.id}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ stageId: stage2Id })
      .expect(200);

    // 2nd: back to stage1
    await request(app.getHttpServer())
      .patch(`/api/leads/${lead.id}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ stageId: stage1Id })
      .expect(200);

    // 3rd: stage1 → stage2 again (must NOT create another execution due to UNIQUE(automationId, leadId))
    await request(app.getHttpServer())
      .patch(`/api/leads/${lead.id}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ stageId: stage2Id })
      .expect(200);

    // Wait briefly for async OnEvent listeners to settle.
    await new Promise((r) => setTimeout(r, 800));

    // Validate via DB: the @Unique(['automationId', 'leadId']) constraint guarantees
    // exactly one execution, regardless of how many stage transitions happened.
    const result: { count: string }[] = await dataSource.query(
      'SELECT COUNT(*)::text AS count FROM automation_executions WHERE "automationId" = $1 AND "leadId" = $2',
      [automationId, lead.id],
    );
    expect(parseInt(result[0].count, 10)).toBe(1);
  });
});
