import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminService } from './platform-admin.service';

@Controller('broadcasts')
@UseGuards(JwtAuthGuard)
export class BroadcastsPublicController {
  constructor(private svc: PlatformAdminService) {}

  @Get('active')
  async listActive() {
    const items = await this.svc.activeBroadcasts();
    return items.map((b) => ({
      id: b.id,
      title: b.title,
      body: b.body,
      severity: b.severity,
    }));
  }
}
