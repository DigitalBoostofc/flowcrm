import { Global, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER } from './storage.constants';
import { StorageService } from './storage.service';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { UploadsController } from './uploads.controller';

const providerFactory: Provider = {
  provide: STORAGE_PROVIDER,
  useFactory: (config: ConfigService, local: LocalStorageProvider, s3: S3StorageProvider) => {
    const driver = (config.get<string>('STORAGE_DRIVER') || 'local').toLowerCase();
    return driver === 's3' ? s3 : local;
  },
  inject: [ConfigService, LocalStorageProvider, S3StorageProvider],
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [LocalStorageProvider, S3StorageProvider, providerFactory, StorageService],
  controllers: [UploadsController],
  exports: [StorageService],
})
export class StorageModule {}
