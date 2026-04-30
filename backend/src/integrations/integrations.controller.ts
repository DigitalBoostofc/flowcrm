import { Controller, Get, Delete, Query, Res, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GoogleCalendarService } from './google-calendar.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly google: GoogleCalendarService,
    private readonly config: ConfigService,
  ) {}

  @Get('google/auth-url')
  @UseGuards(JwtAuthGuard)
  getAuthUrl(@Request() req: any) {
    const url = this.google.getAuthUrl(req.user.id);
    return { url };
  }

  @Get('google/callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: any) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    try {
      await this.google.handleCallback(code, state);
      return res.redirect(`${frontendUrl}/settings?tab=integrations&status=connected`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/settings?tab=integrations&status=error`);
    }
  }

  @Get('google/status')
  @UseGuards(JwtAuthGuard)
  getStatus(@Request() req: any) {
    return this.google.getStatus(req.user.id);
  }

  @Delete('google')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  disconnect(@Request() req: any) {
    return this.google.disconnect(req.user.id);
  }
}
