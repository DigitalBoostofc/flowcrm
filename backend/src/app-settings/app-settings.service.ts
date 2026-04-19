import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';

const SINGLETON_ID = 'singleton';

@Injectable()
export class AppSettingsService {
  constructor(@InjectRepository(AppSetting) private repo: Repository<AppSetting>) {}

  async get(): Promise<AppSetting> {
    let s = await this.repo.findOne({ where: { id: SINGLETON_ID } });
    if (!s) {
      s = this.repo.create({ id: SINGLETON_ID });
      await this.repo.save(s);
    }
    return s;
  }

  async update(data: Partial<Pick<AppSetting, 'systemChannelConfigId' | 'signupEnabled' | 'trialDays'>>): Promise<AppSetting> {
    const current = await this.get();
    Object.assign(current, data);
    return this.repo.save(current);
  }

  async getSystemChannelId(): Promise<string> {
    const s = await this.get();
    if (!s.systemChannelConfigId) {
      throw new NotFoundException('Canal de sistema não configurado');
    }
    return s.systemChannelConfigId;
  }
}
