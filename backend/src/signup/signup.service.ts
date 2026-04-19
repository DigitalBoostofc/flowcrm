import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource, LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OtpVerification } from './entities/otp-verification.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { ChannelsService } from '../channels/channels.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { PipelinesService } from '../pipelines/pipelines.service';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { SignupStartDto } from './dto/signup.dto';

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

@Injectable()
export class SignupService {
  private logger = new Logger(SignupService.name);

  constructor(
    @InjectRepository(OtpVerification) private otpRepo: Repository<OtpVerification>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly appSettings: AppSettingsService,
    private readonly channels: ChannelsService,
    private readonly contacts: ContactsService,
    private readonly leads: LeadsService,
    private readonly pipelines: PipelinesService,
    private readonly tenant: TenantContext,
    private readonly jwt: JwtService,
  ) {}

  async start(dto: SignupStartDto): Promise<{ otpId: string; expiresAt: Date }> {
    const settings = await this.appSettings.get();
    if (!settings.signupEnabled) {
      throw new ServiceUnavailableException('Cadastro público desativado');
    }
    if (!settings.systemChannelConfigId) {
      throw new ServiceUnavailableException('Canal de sistema não configurado');
    }

    const existing = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email já cadastrado');

    const phone = dto.phone.replace(/\D/g, '');
    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

    const otp = this.otpRepo.create({
      phone,
      codeHash,
      purpose: 'signup',
      expiresAt,
      payload: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        workspaceName: dto.workspaceName.trim(),
      },
    });
    await this.otpRepo.save(otp);

    await this.sendOtpMessage(settings.systemChannelConfigId, phone, code);

    return { otpId: otp.id, expiresAt };
  }

  async resend(otpId: string): Promise<{ expiresAt: Date }> {
    const settings = await this.appSettings.get();
    if (!settings.systemChannelConfigId) {
      throw new ServiceUnavailableException('Canal de sistema não configurado');
    }

    const otp = await this.otpRepo.findOne({ where: { id: otpId } });
    if (!otp || otp.consumedAt) throw new BadRequestException('Código inválido');

    const secondsSinceCreate = (Date.now() - new Date(otp.createdAt).getTime()) / 1000;
    if (secondsSinceCreate < RESEND_COOLDOWN_SECONDS) {
      throw new BadRequestException(`Aguarde ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceCreate)}s para reenviar`);
    }

    const code = this.generateCode();
    otp.codeHash = await bcrypt.hash(code, 10);
    otp.expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
    otp.attempts = 0;
    otp.createdAt = new Date();
    await this.otpRepo.save(otp);

    await this.sendOtpMessage(settings.systemChannelConfigId, otp.phone, code);

    return { expiresAt: otp.expiresAt };
  }

  async verify(otpId: string, code: string): Promise<{ accessToken: string; user: { id: string; name: string; email: string; role: UserRole; workspaceId: string } }> {
    const otp = await this.otpRepo.findOne({ where: { id: otpId } });
    if (!otp) throw new BadRequestException('Código inválido');
    if (otp.consumedAt) throw new BadRequestException('Código já utilizado');
    if (otp.expiresAt < new Date()) throw new BadRequestException('Código expirado');
    if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new UnauthorizedException('Muitas tentativas. Solicite um novo código.');

    const ok = await bcrypt.compare(code, otp.codeHash);
    if (!ok) {
      otp.attempts += 1;
      await this.otpRepo.save(otp);
      throw new UnauthorizedException('Código incorreto');
    }

    const payload = otp.payload as {
      name: string;
      email: string;
      passwordHash: string;
      workspaceName: string;
    };

    const existing = await this.userRepo.findOne({ where: { email: payload.email } });
    if (existing) throw new ConflictException('Email já cadastrado');

    const settings = await this.appSettings.get();
    const trialDays = settings.trialDays ?? 7;

    const result = await this.dataSource.transaction(async (manager) => {
      const trialStartedAt = new Date();
      const trialEndsAt = new Date(trialStartedAt.getTime() + trialDays * 86_400_000);
      const workspace = manager.create(Workspace, {
        name: payload.workspaceName,
        trialStartedAt,
        trialEndsAt,
        subscriptionStatus: 'trial',
      });
      const savedWs = await manager.save(workspace);

      const user = manager.create(User, {
        workspaceId: savedWs.id,
        name: payload.name,
        email: payload.email,
        passwordHash: payload.passwordHash,
        phone: otp.phone,
        phoneVerified: true,
        role: UserRole.OWNER,
        active: true,
      });
      const savedUser = await manager.save(user);

      savedWs.ownerUserId = savedUser.id;
      await manager.save(savedWs);

      otp.consumedAt = new Date();
      otp.payload = {};
      await manager.save(otp);

      return { workspace: savedWs, user: savedUser };
    });

    const accessToken = this.jwt.sign({
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      workspaceId: result.user.workspaceId,
    });

    this.trackInAdminWorkspaces({
      name: result.user.name,
      email: result.user.email,
      phone: result.user.phone ?? '',
      workspaceName: result.workspace.name,
    }).catch((err) => this.logger.error('Falha ao rastrear signup em workspaces admin', err as Error));

    return {
      accessToken,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        workspaceId: result.user.workspaceId,
      },
    };
  }

  private async trackInAdminWorkspaces(signup: {
    name: string; email: string; phone: string; workspaceName: string;
  }): Promise<void> {
    const raw = process.env.PLATFORM_ADMIN_EMAILS;
    if (!raw) return;
    const adminEmails = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (adminEmails.length === 0) return;

    const admins = await this.userRepo.find({
      where: adminEmails.map((email) => ({ email })),
    });

    const seen = new Set<string>();
    for (const admin of admins) {
      if (!admin.workspaceId || seen.has(admin.workspaceId)) continue;
      seen.add(admin.workspaceId);

      try {
        await this.tenant.run(admin.workspaceId, undefined, async () => {
          const contact = await this.contacts.create({
            name: signup.name,
            email: signup.email,
            phone: signup.phone,
            origem: 'Cadastro FlowCRM',
          });

          const pipeline = await this.pipelines.findDefault();
          if (!pipeline || !pipeline.stages?.length) return;
          const firstStage = [...pipeline.stages].sort((a, b) => a.position - b.position)[0];

          await this.leads.create({
            contactId: contact.id,
            pipelineId: pipeline.id,
            stageId: firstStage.id,
            title: `Novo cadastro: ${signup.workspaceName}`,
          } as any);
        });
      } catch (err) {
        this.logger.error(`Falha ao criar lead para signup em workspace ${admin.workspaceId}`, err as Error);
      }
    }
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendOtpMessage(channelConfigId: string, phone: string, code: string): Promise<void> {
    const body = `Seu código de verificação FlowCRM é: ${code}\n\nExpira em ${OTP_TTL_MINUTES} minutos.`;
    try {
      await this.channels.send({ channelConfigId, to: phone, body });
    } catch (err) {
      this.logger.error(`Falha ao enviar OTP para ${phone}`, err as Error);
      throw new ServiceUnavailableException('Não foi possível enviar o código. Tente novamente.');
    }
  }

  async purgeExpired(): Promise<void> {
    await this.otpRepo.delete({ expiresAt: LessThan(new Date(Date.now() - 24 * 3600 * 1000)) });
  }
}
