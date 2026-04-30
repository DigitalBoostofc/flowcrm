import { Controller, Get, Delete, Post, Req, UseGuards, HttpCode, Header } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MeService } from './me.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('me')
@ApiBearerAuth('jwt')
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly me: MeService) {}

  /** GET /api/me/data-export — JSON com dados pessoais (LGPD art. 18, II). */
  @Get('data-export')
  @Header('Content-Disposition', 'attachment; filename="meus-dados.json"')
  async dataExport(@Req() req: any) {
    return this.me.exportData(req.user.id);
  }

  /** DELETE /api/me/account — agenda exclusão LGPD (grace de 30d). */
  @Delete('account')
  async deleteAccount(@Req() req: any) {
    return this.me.scheduleAccountDeletion(req.user.id);
  }

  /** POST /api/me/account/restore — cancela exclusão pendente. */
  @Post('account/restore')
  @HttpCode(204)
  async restoreAccount(@Req() req: any) {
    await this.me.cancelAccountDeletion(req.user.id);
  }
}
