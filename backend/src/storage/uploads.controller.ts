import { Controller, Get, Param, Res, NotFoundException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { LocalStorageProvider } from './local-storage.provider';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly local: LocalStorageProvider) {}

  @Get(':folder/:sub/:file')
  serveNested(
    @Param('folder') folder: string,
    @Param('sub') sub: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    return this.stream(`${folder}/${sub}/${file}`, res);
  }

  @Get(':folder/:file')
  serve(
    @Param('folder') folder: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    return this.stream(`${folder}/${file}`, res);
  }

  private stream(key: string, res: Response) {
    if (key.includes('..')) throw new NotFoundException();
    const full = this.local.resolvePath(key);
    if (!fs.existsSync(full)) {
      this.logger.warn(`file not found: ${full}`);
      throw new NotFoundException('Arquivo não encontrado');
    }
    const ext = path.extname(full).toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const stream = fs.createReadStream(full);
    stream.on('error', (err) => {
      this.logger.error(`stream error for ${full}: ${err.message}`);
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  }
}
