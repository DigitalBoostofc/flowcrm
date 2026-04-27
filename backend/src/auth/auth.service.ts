import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { isPlatformAdminEmail } from '../common/platform-admin.util';
import { OtpService } from '../otp/otp.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(User) private userRepo: Repository<User>,
    private otp: OtpService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const payload = { sub: user.id, email: user.email, role: user.role, workspaceId: user.workspaceId };
    return {
      accessToken: this.jwtService.sign(payload),
      user: this.projectUser(user),
    };
  }

  async me(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    return this.projectUser(user);
  }

  async impersonate(adminUser: { id: string; workspaceId: string }, targetUserId: string) {
    const target = await this.userRepo.findOne({ where: { id: targetUserId, workspaceId: adminUser.workspaceId } });
    if (!target) throw new UnauthorizedException('Usuário não encontrado');
    if (target.role === 'owner') throw new UnauthorizedException('Não é possível acessar a conta do proprietário');
    const payload = {
      sub: target.id,
      email: target.email,
      role: target.role,
      workspaceId: target.workspaceId,
      impersonatedBy: adminUser.id,
    };
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '8h' }),
      user: this.projectUser(target),
    };
  }

  async forgotPassword(email: string): Promise<{ maskedPhone: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user?.phone) {
      throw new BadRequestException('Nenhum número de WhatsApp cadastrado para este e-mail.');
    }
    await this.otp.send({
      purpose: 'pwd_reset',
      subject: user.id,
      phone: user.phone,
      name: user.name,
    });
    return { maskedPhone: `****${user.phone.replace(/\D/g, '').slice(-4)}` };
  }

  async verifyResetCode(email: string, code: string): Promise<{ resetToken: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Código inválido ou expirado.');
    const resetToken = await this.otp.verify({
      purpose: 'pwd_reset',
      subject: user.id,
      code,
    });
    return { resetToken };
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    const payload = await this.otp.consume(resetToken, 'pwd_reset');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(payload.subject, { passwordHash: hash });
  }

  private projectUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isPlatformAdmin: isPlatformAdminEmail(user.email),
    };
  }
}
