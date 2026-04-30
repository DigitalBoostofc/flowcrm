import { randomInt } from 'crypto';
import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { ChannelsService } from '../channels/channels.service';
import { PlatformChannelService } from './platform-channel.service';
import { OutboundDispatcherService } from '../messaging/outbound/outbound-dispatcher.service';

const MAX_ATTEMPTS = 5;

export type OtpPurpose = 'pwd_reset' | 'email_change' | 'password_change' | 'signup_verify';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly redis: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly channels: ChannelsService,
    private readonly platform: PlatformChannelService,
    private readonly dispatcher: OutboundDispatcherService,
  ) {
    this.redis = new Redis(this.config.getOrThrow<string>('REDIS_URL'));
  }

  private key(purpose: OtpPurpose, subject: string): string {
    return `otp:${purpose}:${subject.toLowerCase()}`;
  }

  private attemptsKey(purpose: OtpPurpose, subject: string): string {
    return `otp_attempts:${purpose}:${subject.toLowerCase()}`;
  }

  private generateCode(): string {
    return String(randomInt(100000, 1000000));
  }

  private buildBody(purpose: OtpPurpose, code: string, name?: string): string {
    const greet = name ? `Olá ${name}! ` : 'Olá! ';
    const label: Record<OtpPurpose, string> = {
      pwd_reset: 'recuperação de senha',
      email_change: 'alteração de e-mail',
      password_change: 'alteração de senha',
      signup_verify: 'verificação de cadastro',
    };
    return `${greet}👋\n\nSeu código de ${label[purpose]} no *AppexCRM* é:\n\n*${code}*\n\nEle expira em 10 minutos.`;
  }

  async send(params: { purpose: OtpPurpose; subject: string; phone: string; name?: string }): Promise<void> {
    const cleanPhone = params.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new BadRequestException('Número de WhatsApp inválido.');
    }
    const code = this.generateCode();
    await this.redis.set(this.key(params.purpose, params.subject), code, 'EX', 600);

    const channel = await this.platform.requireOwnerChannel();
    const body = this.buildBody(params.purpose, code, params.name);

    // Dispatch async via QUEUE_OUTBOUND. If the enqueue fails (Redis off),
    // dispatcher transparently falls back to a sync send so the caller
    // still gets the message out. Only a "sync-fallback-failed" result
    // surfaces an error — enqueue success returns immediately and the
    // worker takes over.
    const result = await this.dispatcher.dispatch({
      workspaceId: channel.workspaceId,
      channelConfigId: channel.id,
      to: cleanPhone,
      body,
      reason: `otp:${params.purpose}`,
    });

    if (result.mode === 'sync-fallback-failed') {
      this.logger.error(`OTP send failed (${params.purpose}/${params.subject}): ${result.error}`);
      throw new BadRequestException('Falha ao enviar código pelo WhatsApp. Tente novamente.');
    }
  }

  async verify(params: { purpose: OtpPurpose; subject: string; code: string; payload?: Record<string, unknown> }): Promise<string> {
    const attKey = this.attemptsKey(params.purpose, params.subject);
    const attempts = parseInt(await this.redis.get(attKey) ?? '0', 10);
    if (attempts >= MAX_ATTEMPTS) {
      throw new UnauthorizedException('Muitas tentativas. Solicite um novo código.');
    }

    const stored = await this.redis.get(this.key(params.purpose, params.subject));
    if (!stored || stored !== params.code.trim()) {
      await this.redis.incr(attKey);
      await this.redis.expire(attKey, 600);
      throw new UnauthorizedException('Código inválido ou expirado.');
    }

    await Promise.all([
      this.redis.del(this.key(params.purpose, params.subject)),
      this.redis.del(attKey),
    ]);

    const token = this.jwt.sign(
      { type: params.purpose, subject: params.subject, ...params.payload },
      { expiresIn: '5m' },
    );
    return token;
  }

  async consume(token: string, purpose: OtpPurpose): Promise<any> {
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Token de verificação inválido ou expirado.');
    }
    if (payload?.type !== purpose) throw new UnauthorizedException('Token inválido.');

    // One-shot: mark the JWT id as consumed so the same token cannot be replayed within the
    // 5-minute JWT TTL window. We key on the full token (cheap and exact).
    const consumedKey = `otp_consumed:${token}`;
    const set = await this.redis.set(consumedKey, '1', 'EX', 600, 'NX');
    if (set === null) {
      throw new UnauthorizedException('Token já utilizado.');
    }
    return payload;
  }
}
