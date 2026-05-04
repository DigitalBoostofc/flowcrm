import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Res, Query } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { FeatureGuard } from '../common/feature-access/feature.guard';
import { RequireFeature } from '../common/feature-access/require-feature.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

class CheckNumberDto {
  @IsString()
  phone: string;
}

class TypingDto {
  @IsString()
  chatId: string;

  @IsOptional()
  @IsString()
  type?: 'composing' | 'paused' | 'recording';
}

class MarkReadDto {
  @IsString()
  chatId: string;
}

@ApiTags('channels')
@ApiBearerAuth('jwt')
@Controller('channels')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('whatsapp_channels')
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  create(@Body() dto: CreateChannelDto) {
    return this.channelsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.channelsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.channelsService.findById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string) {
    return this.channelsService.remove(id);
  }

  @Post(':id/provision')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async provision(@Param('id') id: string, @Request() req: any) {
    const webhookUrl = await this.buildWebhookUrl(req, id);
    const { qrCode } = await this.channelsService.provisionInstance(id, webhookUrl);
    return { ok: true, webhookUrl, qrCode };
  }

  @Post(':id/refresh-webhook')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async refreshWebhook(@Param('id') id: string, @Request() req: any) {
    const webhookUrl = await this.buildWebhookUrl(req, id);
    await this.channelsService.refreshWebhook(id, webhookUrl);
    return { ok: true, webhookUrl };
  }

  @Post(':id/check-number')
  @UseGuards(JwtAuthGuard)
  async checkNumber(@Param('id') id: string, @Body() dto: CheckNumberDto) {
    return this.channelsService.checkNumber(id, dto.phone);
  }

  @Get(':id/wa-limits')
  @UseGuards(JwtAuthGuard)
  async waLimits(@Param('id') id: string) {
    return this.channelsService.getWaLimits(id);
  }

  @Post(':id/typing')
  @UseGuards(JwtAuthGuard)
  async typing(@Param('id') id: string, @Body() dto: TypingDto) {
    await this.channelsService.sendTyping(id, dto.chatId, dto.type);
    return { ok: true };
  }

  @Post(':id/mark-read')
  @UseGuards(JwtAuthGuard)
  async markRead(@Param('id') id: string, @Body() dto: MarkReadDto) {
    await this.channelsService.markRead(id, dto.chatId);
    return { ok: true };
  }

  private async buildWebhookUrl(req: any, id: string): Promise<string> {
    const channel = await this.channelsService.findById(id);
    const secret = channel.config.webhookSecret;
    const host = req.get('host');
    const forwardedProto = req.get('x-forwarded-proto');
    const isLocal = /^(localhost|127\.|0\.0\.0\.0|::1)/.test(host ?? '');
    // For non-local hosts always use https regardless of x-forwarded-proto — prevents http webhook registration behind reverse proxies that don't forward the header
    const protocol = isLocal ? (forwardedProto || req.protocol || 'http') : 'https';
    const provider = channel.type === 'uazapi' ? 'uazapi' : 'evolution';
    return `${protocol}://${host}/api/webhooks/${provider}/${id}/${secret}`;
  }

  @Get(':id/qr')
  @UseGuards(JwtAuthGuard)
  async qr(@Param('id') id: string, @Request() req: any, @Res() res: any) {
    const qr = await this.channelsService.getQrCode(id);
    const acceptsJson = (req.headers.accept || '').includes('application/json');
    if (acceptsJson) {
      return res.json(qr);
    }
    const imgSrc = qr.base64
      ? qr.base64.startsWith('data:')
        ? qr.base64
        : 'data:image/png;base64,' + qr.base64
      : '';
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AppexCRM - Escanear WhatsApp</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
    .card { background: #1e293b; border-radius: 12px; padding: 32px; text-align: center; max-width: 400px; }
    h1 { margin-top: 0; color: #10b981; }
    img { max-width: 100%; height: auto; border-radius: 8px; background: white; padding: 8px; }
    .step { margin: 12px 0; color: #94a3b8; font-size: 14px; }
    .pairing { font-size: 32px; letter-spacing: 6px; color: #3b82f6; margin: 16px 0; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Escanear WhatsApp</h1>
    <p class="step">1. Abra o WhatsApp no celular</p>
    <p class="step">2. Menu > Dispositivos conectados</p>
    <p class="step">3. Escaneie o QR abaixo</p>
    ${imgSrc ? `<img src="${imgSrc}" alt="QR Code">` : ''}
    ${qr.pairingCode ? `<p class="step">Ou use o código:</p><div class="pairing">${qr.pairingCode}</div>` : ''}
    <p class="step">Atualize a página se o QR expirar</p>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }
}
