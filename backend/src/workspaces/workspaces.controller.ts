import { Controller, Get, Patch, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { WorkspacesService } from './workspaces.service';
import { isPlatformAdminEmail } from '../common/platform-admin.util';

interface AuthedRequest {
  user: { id: string; email: string; workspaceId: string; role: string };
}

@Controller('workspace')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private service: WorkspacesService) {}

  @Get('me')
  async getMine(@Req() req: AuthedRequest) {
    const workspace = await this.service.findOneWithTrial(req.user.workspaceId);
    return Object.assign(workspace, {
      isPlatformAdmin: isPlatformAdminEmail(req.user.email),
    });
  }

  @Patch('me/settings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  async updateSettings(
    @Req() req: AuthedRequest,
    @Body() body: { defaultLeadPrivacy?: 'all' | 'restricted' },
  ) {
    return this.service.updateSettings(req.user.workspaceId, body);
  }

  @Delete('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  async deleteAccount(@Req() req: AuthedRequest) {
    await this.service.deleteWorkspaceAndAllData(req.user.workspaceId);
    return { ok: true };
  }
}
