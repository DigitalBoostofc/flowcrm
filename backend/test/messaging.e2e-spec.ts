import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ChannelsService } from '../src/channels/channels.service';
import { InboundListener } from '../src/channels/inbound.listener';

describe('Messaging Pipeline (e2e)', () => {
  let app: INestApplication;
  let inboundListener: InboundListener;
  let ownerToken: string;
  let pipelineId: string;
  let stage1Id: string;
  let stage2Id: string;
  let channelConfigId: string;
  let templateId: string;

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getJob: jest.fn().mockResolvedValue(null),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const mockChannelSend = jest
    .fn()
    .mockResolvedValue({ externalMessageId: 'sent-123', status: 'sent' });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('automation'))
      .useValue(mockQueue)
      .overrideProvider(getQueueToken('scheduled-message'))
      .useValue(mockQueue)
      .overrideProvider(getQueueToken('outbound-message'))
      .useValue(mockQueue)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    app.setGlobalPrefix('api');
    await app.init();

    // Replace channel send with mock
    const channels = app.get(ChannelsService);
    channels.send = mockChannelSend;

    inboundListener = app.get(InboundListener);

    // Login as owner
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'owner@flowcrm.com', password: 'flowcrm123' });
    ownerToken = loginRes.body.accessToken;

    // Create pipeline with 2 stages
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

    // Create channel config
    const channelRes = await request(app.getHttpServer())
      .post('/api/channels')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Evo Test',
        type: 'evolution',
        config: { instance: 'test-inst', apiKey: 'test-key', webhookSecret: 'test-secret' },
      });
    channelConfigId = channelRes.body.id;

    // Create template
    const templateRes = await request(app.getHttpServer())
      .post('/api/templates')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Boas-vindas Test', body: 'Olá {nome}!' });
    templateId = templateRes.body.id;
  });

  afterAll(async () => {
    // Cleanup: delete test pipeline cascades to stages, messages, conversations, leads
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

    // Verify lead was created (find via contacts)
    const contactsRes = await request(app.getHttpServer())
      .get('/api/contacts?search=' + encodeURIComponent(phone))
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(contactsRes.body.length).toBeGreaterThan(0);
    const contactId = contactsRes.body[0].id;

    // Get lead by pipeline
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

    // Send first webhook
    await inboundListener.handle({
      channelType: 'evolution',
      channelConfigId,
      externalMessageId: externalId,
      from: phone,
      fromName: 'Maria Dup',
      body: 'First message',
      receivedAt: new Date(),
    });

    // Send exact same webhook again
    await inboundListener.handle({
      channelType: 'evolution',
      channelConfigId,
      externalMessageId: externalId,
      from: phone,
      fromName: 'Maria Dup',
      body: 'First message',
      receivedAt: new Date(),
    });

    // Get the lead/conversation
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
    expect(msgsRes.body.length).toBe(1); // not 2
  });

  it('automation fires once; moving back and forth does NOT re-fire', async () => {
    // Create automation on stage 2
    await request(app.getHttpServer())
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

    // Create a lead in stage 1 via inbound
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

    const callsBefore = mockQueue.add.mock.calls.length;

    // Move to stage 2 → should trigger
    await request(app.getHttpServer())
      .patch(`/api/leads/${lead.id}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ stageId: stage2Id })
      .expect(200);

    // Move back to stage 1
    await request(app.getHttpServer())
      .patch(`/api/leads/${lead.id}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ stageId: stage1Id })
      .expect(200);

    // Move forward to stage 2 again → should NOT re-fire
    await request(app.getHttpServer())
      .patch(`/api/leads/${lead.id}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ stageId: stage2Id })
      .expect(200);

    // Give event emitter a moment to process async handlers
    await new Promise((r) => setTimeout(r, 500));

    const callsAfter = mockQueue.add.mock.calls.length;
    // Only 1 queue.add call for automation — the first move. Second entry into stage 2 is blocked by unique constraint.
    expect(callsAfter - callsBefore).toBe(1);
  });
});
