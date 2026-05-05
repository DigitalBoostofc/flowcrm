import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { TenantCacheService } from './tenant-cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        stores: [
          new Keyv({
            store: new KeyvRedis(config.getOrThrow<string>('REDIS_URL')),
            ttl: 120_000,
          }),
        ],
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [TenantCacheService],
  exports: [TenantCacheService, NestCacheModule],
})
export class AppCacheModule {}
