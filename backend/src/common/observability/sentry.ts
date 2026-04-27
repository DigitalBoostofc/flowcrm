import * as Sentry from '@sentry/node';
import { Logger } from '@nestjs/common';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    release: process.env.SENTRY_RELEASE,
  });
  initialized = true;
  Logger.log(`Sentry initialized (env=${process.env.NODE_ENV})`, 'Bootstrap');
}

export { Sentry };
