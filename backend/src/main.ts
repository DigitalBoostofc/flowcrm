import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  const allowedOrigin = process.env.FRONTEND_URL || (process.env.NODE_ENV !== 'production' ? '*' : undefined);
  if (!allowedOrigin) throw new Error('FRONTEND_URL env var is required in production');
  app.enableCors({ origin: allowedOrigin });
  app.setGlobalPrefix('api');
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`FlowCRM backend running on port ${port}`, 'Bootstrap');
}
bootstrap();
