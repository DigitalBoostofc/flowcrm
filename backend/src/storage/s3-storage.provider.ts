import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StorageProvider, StoredFile } from './storage.interface';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('S3_ENDPOINT');
    const region = config.get<string>('S3_REGION') || 'auto';
    const accessKeyId = config.getOrThrow<string>('S3_ACCESS_KEY');
    const secretAccessKey = config.getOrThrow<string>('S3_SECRET_KEY');
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
    this.publicBaseUrl = config.getOrThrow<string>('S3_PUBLIC_BASE_URL').replace(/\/$/, '');

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: !!endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async upload(params: { key: string; body: Buffer; contentType: string }): Promise<StoredFile> {
    const safeKey = params.key.replace(/^\/+/, '');
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
        Body: params.body,
        ContentType: params.contentType,
        ACL: 'public-read',
      }),
    );
    return { key: safeKey, url: `${this.publicBaseUrl}/${safeKey}` };
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key.replace(/^\/+/, '') }));
    } catch (err: any) {
      this.logger.warn(`delete ${key}: ${err.message}`);
    }
  }
}
