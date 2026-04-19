import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspacesService } from './workspaces.service';

interface AuthedRequest {
  user: { id: string; workspaceId: string };
}

@Controller('workspace')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private service: WorkspacesService) {}

  @Get('me')
  getMine(@Req() req: AuthedRequest) {
    return this.service.findOne(req.user.workspaceId);
  }
}
