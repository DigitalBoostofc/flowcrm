import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly redis: Redis;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    this.redis = new Redis(this.config.getOrThrow<string>('REDIS_URL'));
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const payload = { sub: user.id, email: user.email, role: user.role, workspaceId: user.workspaceId };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role, workspaceId: user.workspaceId },
    };
  }

  // ── Recuperação de senha via WhatsApp ──────────────────────────

  async forgotPassword(email: string): Promise<{ maskedPhone: string }> {
    const user = await this.usersService.findByEmail(email);

    if (!user?.phone) {
      throw new BadRequestException('Nenhum número de WhatsApp cadastrado para este e-mail.');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.redis.set(`pwd_reset:${user.id}`, code, 'EX', 600); // 10 min

    await this.sendWhatsAppCode(user.phone, code, user.name).catch(err =>
      console.warn(`Falha ao enviar código WhatsApp: ${err.message}`)
    );

    const masked = `****${user.phone.slice(-4)}`;
    return { maskedPhone: masked };
  }

  async verifyResetCode(email: string, code: string): Promise<{ resetToken: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Código inválido ou expirado.');

    const stored = await this.redis.get(`pwd_reset:${user.id}`);
    if (!stored || stored !== code.trim()) {
      throw new UnauthorizedException('Código inválido ou expirado.');
    }

    await this.redis.del(`pwd_reset:${user.id}`);

    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'pwd_reset' },
      { expiresIn: '5m' },
    );

    return { resetToken };
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    let payload: any;
    try {
      payload = this.jwtService.verify(resetToken);
    } catch {
      throw new UnauthorizedException('Token de recuperação inválido ou expirado.');
    }

    if (payload?.type !== 'pwd_reset') throw new UnauthorizedException('Token inválido.');

    const hash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(payload.sub, { passwordHash: hash });
  }

  private async sendWhatsAppCode(phone: string, code: string, name: string): Promise<void> {
    const baseUrl = this.config.get<string>('UAZAPI_BASE_URL', '').replace(/\/$/, '');
    const adminToken = this.config.get<string>('UAZAPI_ADMIN_TOKEN', '');
    if (!baseUrl || !adminToken) return;

    const instances = await axios.get(`${baseUrl}/instance/all`, {
      headers: { admintoken: adminToken },
      timeout: 10000,
    });

    const connected = (instances.data as any[]).find((i: any) => i.status === 'connected');
    if (!connected) return;

    const cleanPhone = phone.replace(/\D/g, '');
    const text = `Olá ${name}! 👋\n\nSeu código de recuperação de senha do *FlowCRM* é:\n\n*${code}*\n\nEle expira em 10 minutos.`;

    await axios.post(
      `${baseUrl}/send/text`,
      { number: cleanPhone, text },
      { headers: { token: connected.token }, timeout: 15000 },
    );
  }
}
