import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_FEATURE_KEY } from './require-feature.decorator';
import { FeatureAccessService } from './feature-access.service';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureAccess: FeatureAccessService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRED_FEATURE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!feature) return true;

    const req = ctx.switchToHttp().getRequest<{ user?: { workspaceId?: string } }>();
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) return true;

    const ok = await this.featureAccess.workspaceHasFeature(workspaceId, feature);
    if (!ok) {
      throw new HttpException(
        {
          message: 'Função disponível no plano Performance',
          code: 'feature_locked',
          feature,
        },
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
