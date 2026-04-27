import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SendProfileOtpDto, VerifyProfileOtpDto } from './dto/send-otp.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './entities/user.entity';
import { OtpService } from '../otp/otp.service';
import { CurrentUser } from '../auth/current-user.decorator';

function serialize(user: any) {
  const { passwordHash, ...rest } = user ?? {};
  return rest;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private otp: OtpService,
  ) {}

  @Get('me')
  async me(@CurrentUser() user: { id: string }) {
    return serialize(await this.usersService.getProfile(user.id));
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateProfileDto) {
    return serialize(await this.usersService.updateProfile(user.id, dto));
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(@CurrentUser() user: { id: string }, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo de imagem é obrigatório.');
    return serialize(await this.usersService.updateAvatar(user.id, file));
  }

  @Delete('me/avatar')
  async deleteAvatar(@CurrentUser() user: { id: string }) {
    return serialize(await this.usersService.removeAvatar(user.id));
  }

  @Post('me/otp/send')
  async sendProfileOtp(@CurrentUser() user: { id: string }, @Body() dto: SendProfileOtpDto) {
    const profile = await this.usersService.getProfile(user.id);
    if (!profile.phone) {
      throw new BadRequestException('Cadastre seu WhatsApp antes de trocar e-mail ou senha.');
    }
    await this.otp.send({
      purpose: dto.purpose,
      subject: profile.id,
      phone: profile.phone,
      name: profile.name,
    });
    return { maskedPhone: `****${profile.phone.replace(/\D/g, '').slice(-4)}` };
  }

  @Post('me/otp/verify')
  async verifyProfileOtp(@CurrentUser() user: { id: string }, @Body() dto: VerifyProfileOtpDto) {
    const otpToken = await this.otp.verify({
      purpose: dto.purpose,
      subject: user.id,
      code: dto.code,
    });
    return { otpToken };
  }

  @Patch('me/email')
  async changeEmail(@CurrentUser() user: { id: string }, @Body() dto: ChangeEmailDto) {
    const payload = await this.otp.consume(dto.otpToken, 'email_change');
    if (payload.subject !== user.id) throw new BadRequestException('Token inválido para este usuário.');
    return serialize(await this.usersService.setEmail(user.id, dto.email));
  }

  @Patch('me/password')
  async changePassword(@CurrentUser() user: { id: string }, @Body() dto: ChangePasswordDto) {
    const payload = await this.otp.consume(dto.otpToken, 'password_change');
    if (payload.subject !== user.id) throw new BadRequestException('Token inválido para este usuário.');
    await this.usersService.setPassword(user.id, dto.newPassword);
    return { ok: true };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  updateRole(@Param('id') id: string, @Body('role') role: UserRole) {
    return this.usersService.updateRole(id, role);
  }

  @Patch(':id/active')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  setActive(@Param('id') id: string, @Body('active') active: boolean) {
    return this.usersService.setActive(id, active);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
