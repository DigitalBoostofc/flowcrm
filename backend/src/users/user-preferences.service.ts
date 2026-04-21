import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreference } from './entities/user-preference.entity';

@Injectable()
export class UserPreferencesService {
  constructor(
    @InjectRepository(UserPreference)
    private repo: Repository<UserPreference>,
  ) {}

  async getAll(userId: string): Promise<Record<string, unknown>> {
    const rows = await this.repo.find({ where: { userId } });
    const result: Record<string, unknown> = {};
    for (const row of rows) result[row.key] = row.value;
    return result;
  }

  async set(userId: string, key: string, value: unknown): Promise<void> {
    const existing = await this.repo.findOne({ where: { userId, key } });
    if (existing) {
      existing.value = value;
      await this.repo.save(existing);
    } else {
      await this.repo.save(this.repo.create({ userId, key, value }));
    }
  }

  async remove(userId: string, key: string): Promise<void> {
    await this.repo.delete({ userId, key });
  }
}
