import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CaptureService } from './capture.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { WidgetConfig } from '../workspaces/entities/workspace.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Controller()
export class CaptureController {
  constructor(
    private readonly service: CaptureService,
    private readonly tenant: TenantContext,
  ) {}

  /** Public — no auth required */
  @Get('public/capture/:workspaceId/config')
  getPublicConfig(@Param('workspaceId') workspaceId: string) {
    return this.service.getPublicConfig(workspaceId);
  }

  /** Public — no auth required */
  @Post('public/capture/:workspaceId')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  capture(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { name: string; phone: string; email?: string; message?: string; contactType?: 'fisica' | 'juridica' },
  ) {
    return this.service.capture(workspaceId, body);
  }

  /** Authenticated — owner/manager only */
  @Patch('workspaces/widget-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateConfig(@Req() req: any, @Body() config: WidgetConfig) {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.service.updateConfig(workspaceId, config);
  }

  /** Authenticated — get current config (regardless of enabled state) */
  @Get('workspaces/widget-config')
  @UseGuards(JwtAuthGuard)
  async getConfig() {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.service.getPrivateConfig(workspaceId);
  }
}
