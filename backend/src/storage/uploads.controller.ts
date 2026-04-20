import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { LocalStorageProvider } from './local-storage.provider';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly local: LocalStorageProvider) {}

  @Get(':folder/:file')
  serve(@Param('folder') folder: string, @Param('file') file: string, @Res() res: Response) {
    const key = `${folder}/${file}`;
    const full = path.resolve(this.local.resolvePath(key));

    if (!fs.existsSync(full)) {
      throw new NotFoundException('Arquivo não encontrado');
    }

    // sendFile com root='/' aceita path absoluto em qualquer SO
    res.sendFile(full, { root: '/' }, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ message: 'Arquivo não encontrado' });
      }
    });
  }
}
