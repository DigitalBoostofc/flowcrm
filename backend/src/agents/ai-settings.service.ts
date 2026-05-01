import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { WorkspaceAiSettings } from './entities/workspace-ai-settings.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { SecretCryptoService } from '../common/crypto/secret-crypto.service';
import { UpdateAiSettingsDto } from './dto/ai-settings.dto';

export interface AiSettingsView {
  id: string;
  workspaceId: string;
  provider: string;
  keySource: 'platform' | 'byo';
  apiKeyMasked: string | null;
  defaultModel: string;
  monthlyTokenBudget: number | null;
  tokensUsedThisMonth: number;
  lastValidatedAt: Date | null;
  enabled: boolean;
}

@Injectable()
export class AiSettingsService {
  private readonly logger = new Logger(AiSettingsService.name);

  constructor(
    @InjectRepository(WorkspaceAiSettings) private readonly repo: Repository<WorkspaceAiSettings>,
    private readonly tenant: TenantContext,
    private readonly crypto: SecretCryptoService,
  ) {}

  async getOrCreate(): Promise<WorkspaceAiSettings> {
    const workspaceId = this.tenant.requireWorkspaceId();
    let settings = await this.repo.findOne({ where: { workspaceId } });
    if (!settings) {
      settings = this.repo.create({ workspaceId });
      settings = await this.repo.save(settings);
    }
    return settings;
  }

  async getView(): Promise<AiSettingsView> {
    const s = await this.getOrCreate();
    return {
      id: s.id,
      workspaceId: s.workspaceId,
      provider: s.provider,
      keySource: s.keySource,
      apiKeyMasked: s.apiKeyLast4 ? `${'•'.repeat(20)}${s.apiKeyLast4}` : null,
      defaultModel: s.defaultModel,
      monthlyTokenBudget: s.monthlyTokenBudget,
      tokensUsedThisMonth: s.tokensUsedThisMonth,
      lastValidatedAt: s.lastValidatedAt,
      enabled: s.enabled,
    };
  }

  async update(dto: UpdateAiSettingsDto): Promise<AiSettingsView> {
    const settings = await this.getOrCreate();

    if (dto.keySource !== undefined) settings.keySource = dto.keySource;
    if (dto.defaultModel !== undefined) settings.defaultModel = dto.defaultModel;
    if (dto.monthlyTokenBudget !== undefined) settings.monthlyTokenBudget = dto.monthlyTokenBudget;
    if (dto.enabled !== undefined) settings.enabled = dto.enabled;

    if (dto.apiKey !== undefined) {
      if (settings.keySource !== 'byo' && !dto.keySource) {
        throw new BadRequestException('Para colar uma API key, defina keySource="byo".');
      }
      settings.apiKeyEncrypted = this.crypto.encrypt(dto.apiKey);
      settings.apiKeyLast4 = dto.apiKey.slice(-4);
      settings.lastValidatedAt = null;
    }

    await this.repo.save(settings);
    return this.getView();
  }

  /**
   * Bate na Anthropic com 1 token pra confirmar que a key funciona.
   * Não consome cota relevante (~$0.0001).
   */
  async validate(): Promise<{ ok: boolean; error?: string }> {
    const settings = await this.getOrCreate();

    let apiKey: string | null = null;
    if (settings.keySource === 'byo') {
      if (!settings.apiKeyEncrypted) {
        return { ok: false, error: 'Nenhuma API key configurada.' };
      }
      try {
        apiKey = this.crypto.decrypt(settings.apiKeyEncrypted);
      } catch {
        return { ok: false, error: 'Falha ao decifrar a API key armazenada.' };
      }
    } else {
      apiKey = process.env.ANTHROPIC_API_KEY ?? null;
      if (!apiKey) {
        return { ok: false, error: 'Plataforma não configurou ANTHROPIC_API_KEY.' };
      }
    }

    try {
      await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: settings.defaultModel,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ok' }],
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 15000,
        },
      );
      settings.lastValidatedAt = new Date();
      await this.repo.save(settings);
      return { ok: true };
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.error?.message ?? err.message;
      this.logger.warn(`AI validate failed (${status}): ${detail}`);
      return { ok: false, error: detail };
    }
  }
}
