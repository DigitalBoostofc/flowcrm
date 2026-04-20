import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageProvider, StoredFile } from './storage.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = config.get<string>('UPLOAD_ROOT') || path.join(process.cwd(), 'uploads');
  }

  async upload(params: { key: string; body: Buffer; contentType: string }): Promise<StoredFile> {
    const safeKey = params.key.replace(/^\/+/, '');
    const full = path.join(this.root, safeKey);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, params.body);
    const url = `/api/uploads/${safeKey}`;
    return { key: safeKey, url };
  }

  async delete(key: string): Promise<void> {
    const full = path.join(this.root, key.replace(/^\/+/, ''));
    try {
      await fs.unlink(full);
    } catch (err: any) {
      if (err.code !== 'ENOENT') this.logger.warn(`delete ${key}: ${err.message}`);
    }
  }

  resolvePath(key: string): string {
    return path.join(this.root, key.replace(/^\/+/, ''));
  }

  get rootPath(): string {
    return this.root;
  }
}
