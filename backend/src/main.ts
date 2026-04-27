import { NestFactory, Reflector } from '@nestjs/core';
import * as fs from 'fs';
import * as path from 'path';
import { ValidationPipe, Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Queue, QueueOptions } from 'bullmq';
import { AppModule } from './app.module';

async function bootstrap() {
  // Garante que o diretório de uploads existe ao iniciar
  const uploadRoot = process.env.UPLOAD_ROOT || path.join(process.cwd(), 'uploads');
  fs.mkdirSync(path.join(uploadRoot, 'avatars'), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.set('trust proxy', 1);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  const allowedOrigin = process.env.FRONTEND_URL || (process.env.NODE_ENV !== 'production' ? '*' : undefined);
  if (!allowedOrigin) throw new Error('FRONTEND_URL env var is required in production');
  app.enableCors({ origin: allowedOrigin });
  app.setGlobalPrefix('api');

  const redisUrl = process.env.REDIS_URL;
  const bullBoardUser = process.env.BULL_BOARD_USER;
  const bullBoardPass = process.env.BULL_BOARD_PASS;
  if (redisUrl && bullBoardUser && bullBoardPass) {
    try {
      const serverAdapter = new ExpressAdapter();
      serverAdapter.setBasePath('/admin/queues');

      const connection = { url: redisUrl } as QueueOptions['connection'];
      const automationQueue = new Queue('automation', { connection });
      const scheduledQueue = new Queue('scheduled-message', { connection });
      const outboundQueue = new Queue('outbound-message', { connection });

      createBullBoard({
        queues: [
          new BullMQAdapter(automationQueue),
          new BullMQAdapter(scheduledQueue),
          new BullMQAdapter(outboundQueue),
        ],
        serverAdapter,
      });

      const basicAuthMiddleware = (req: any, res: any, next: any) => {
        const header = req.headers['authorization'] ?? '';
        if (!header.startsWith('Basic ')) {
          res.set('WWW-Authenticate', 'Basic realm="Bull Board"');
          return res.status(401).send('Authentication required');
        }
        const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
        const sep = decoded.indexOf(':');
        const user = sep >= 0 ? decoded.slice(0, sep) : '';
        const pass = sep >= 0 ? decoded.slice(sep + 1) : '';
        const expectedUser = Buffer.from(bullBoardUser);
        const expectedPass = Buffer.from(bullBoardPass);
        const givenUser = Buffer.from(user);
        const givenPass = Buffer.from(pass);
        const userOk =
          givenUser.length === expectedUser.length &&
          require('crypto').timingSafeEqual(givenUser, expectedUser);
        const passOk =
          givenPass.length === expectedPass.length &&
          require('crypto').timingSafeEqual(givenPass, expectedPass);
        if (!userOk || !passOk) {
          res.set('WWW-Authenticate', 'Basic realm="Bull Board"');
          return res.status(401).send('Invalid credentials');
        }
        next();
      };

      app.use('/admin/queues', basicAuthMiddleware, serverAdapter.getRouter());
      Logger.log('Bull Board mounted at /admin/queues (basic auth enabled)', 'Bootstrap');
    } catch (err) {
      Logger.warn(`Bull Board setup failed: ${(err as Error).message}`, 'Bootstrap');
    }
  } else if (redisUrl) {
    Logger.warn(
      'Bull Board NÃO foi montado: BULL_BOARD_USER/BULL_BOARD_PASS ausentes (proteção obrigatória).',
      'Bootstrap',
    );
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`AppexCRM backend running on port ${port}`, 'Bootstrap');
}
bootstrap();
