import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  private redis: Redis | null = null;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
      this.redis.connect().catch(() => undefined);
    }
  }

  @Get()
  async check() {
    const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

    const dbStart = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      checks.db = { ok: true, latencyMs: Date.now() - dbStart };
    } catch (err) {
      checks.db = { ok: false, error: (err as Error).message };
    }

    if (this.redis) {
      const rStart = Date.now();
      try {
        const pong = await this.redis.ping();
        checks.redis = { ok: pong === 'PONG', latencyMs: Date.now() - rStart };
      } catch (err) {
        checks.redis = { ok: false, error: (err as Error).message };
      }
    }

    const allOk = Object.values(checks).every((c) => c.ok);
    const body = {
      status: allOk ? 'ok' : 'degraded',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks,
    };
    if (!allOk) throw new ServiceUnavailableException(body);
    return body;
  }

  @Get('live')
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // Deliberately throws to validate the Sentry pipeline end-to-end. Closed by
  // default; enable with ALLOW_SENTRY_TEST=true on the env, hit the endpoint
  // once, confirm the issue lands in Sentry, then unset the var.
  @Get('sentry-test')
  sentryTest() {
    if (this.config.get<string>('ALLOW_SENTRY_TEST') !== 'true') {
      return { status: 'disabled', hint: 'set ALLOW_SENTRY_TEST=true to enable' };
    }
    throw new Error(`Sentry pipeline test fired at ${new Date().toISOString()}`);
  }
}
