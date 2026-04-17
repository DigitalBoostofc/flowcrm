import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.FRONTEND_URL || '*' });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3001);
  console.log(`FlowCRM backend running on port ${process.env.PORT ?? 3001}`);
}
bootstrap();
