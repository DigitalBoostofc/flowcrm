import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { TenantCacheService } from './tenant-cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const url = new URL(config.getOrThrow<string>('REDIS_URL'));
        return {
          store: await redisStore({
            host: url.hostname,
            port: url.port ? parseInt(url.port, 10) : 6379,
            password: url.password || undefined,
            db: url.pathname && url.pathname.length > 1 ? parseInt(url.pathname.slice(1), 10) : 0,
            // Default cache TTL in milliseconds (per-call TTL overrides this).
            ttl: 120_000,
          }),
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [TenantCacheService],
  exports: [TenantCacheService, NestCacheModule],
})
export class AppCacheModule {}
