import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import { LocalStorageProvider } from './local-storage.provider';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly local: LocalStorageProvider) {}

  @Get(':folder/:file')
  serve(@Param('folder') folder: string, @Param('file') file: string, @Res() res: Response) {
    const key = `${folder}/${file}`;
    const full = this.local.resolvePath(key);
    if (!fs.existsSync(full)) throw new NotFoundException();
    res.sendFile(full);
  }
}
