import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { isPlatformAdminEmail } from './platform-admin.util';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const email = req.user?.email;
    if (!isPlatformAdminEmail(email)) {
      throw new ForbiddenException('Apenas administradores da plataforma');
    }
    return true;
  }
}
