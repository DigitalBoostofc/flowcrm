import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth + Leads Flow (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let pipelineId: string;
  let stageId: string;
  let contactId: string;
  let leadId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(() => app.close());

  it('POST /api/auth/login — owner login returns token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'owner@flowcrm.com', password: 'flowcrm123' })
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    ownerToken = res.body.accessToken;
  });

  it('POST /api/pipelines — creates pipeline', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/pipelines')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Vendas', isDefault: true })
      .expect(201);
    pipelineId = res.body.id;
    expect(res.body.name).toBe('Vendas');
  });

  it('POST /api/pipelines/:id/stages — creates stage', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/pipelines/${pipelineId}/stages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Qualificação', position: 0 })
      .expect(201);
    stageId = res.body.id;
    expect(res.body.name).toBe('Qualificação');
  });

  it('POST /api/contacts — creates contact', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/contacts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'João Silva', phone: '+5511999999999' })
      .expect(201);
    contactId = res.body.id;
    expect(res.body.name).toBe('João Silva');
  });

  it('POST /api/leads — creates lead in stage', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ contactId, pipelineId, stageId, value: 2500 })
      .expect(201);
    leadId = res.body.id;
    expect(res.body.stageId).toBe(stageId);
  });

  it('PATCH /api/leads/:id/move — moves lead to new stage', async () => {
    const stageRes = await request(app.getHttpServer())
      .post(`/api/pipelines/${pipelineId}/stages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Proposta', position: 1 })
      .expect(201);
    const newStageId = stageRes.body.id;

    const res = await request(app.getHttpServer())
      .patch(`/api/leads/${leadId}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ stageId: newStageId })
      .expect(200);
    expect(res.body.stageId).toBe(newStageId);
  });
});
