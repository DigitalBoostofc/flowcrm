import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { STORAGE_PROVIDER } from './storage.constants';
import { StorageProvider, StoredFile } from './storage.interface';

const IMAGE_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  async uploadImage(params: {
    folder: string;
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number };
  }): Promise<StoredFile> {
    const { file, folder } = params;
    if (!IMAGE_MIME.has(file.mimetype)) {
      throw new BadRequestException('Formato de imagem inválido. Use JPG, PNG, WEBP ou GIF.');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Imagem excede o limite de 5MB.');
    }
    const ext = (extname(file.originalname) || '').toLowerCase() || mimeToExt(file.mimetype);
    const key = `${folder.replace(/^\/+|\/+$/g, '')}/${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    return this.provider.upload({ key, body: file.buffer, contentType: file.mimetype });
  }

  delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '';
  }
}
