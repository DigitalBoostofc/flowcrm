import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspacesService } from './workspaces.service';
import { isPlatformAdminEmail } from '../common/platform-admin.util';

interface AuthedRequest {
  user: { id: string; email: string; workspaceId: string };
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
}
