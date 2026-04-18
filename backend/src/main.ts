import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Queue, QueueOptions } from 'bullmq';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  const allowedOrigin = process.env.FRONTEND_URL || (process.env.NODE_ENV !== 'production' ? '*' : undefined);
  if (!allowedOrigin) throw new Error('FRONTEND_URL env var is required in production');
  app.enableCors({ origin: allowedOrigin });
  app.setGlobalPrefix('api');

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
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
      app.use('/admin/queues', serverAdapter.getRouter());
      Logger.log('Bull Board mounted at /admin/queues', 'Bootstrap');
    } catch (err) {
      Logger.warn(`Bull Board setup failed: ${(err as Error).message}`, 'Bootstrap');
    }
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`FlowCRM backend running on port ${port}`, 'Bootstrap');
}
bootstrap();
