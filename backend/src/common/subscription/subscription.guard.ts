import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';

const WHITELIST_PREFIXES = [
  '/auth',
  '/signup',
  '/subscriptions',
  '/workspace/me',
  '/app-settings',
];

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(@InjectRepository(Workspace) private wsRepo: Repository<Workspace>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: { workspaceId?: string }; path?: string; url?: string }>();
    if (!req.user?.workspaceId) return true;

    const path = (req.path ?? req.url ?? '').split('?')[0];
    if (WHITELIST_PREFIXES.some((p) => path.startsWith(p))) return true;

    const w = await this.wsRepo.findOne({ where: { id: req.user.workspaceId } });
    if (!w) return true;

    if (w.subscriptionStatus === 'trial' && new Date(w.trialEndsAt).getTime() < Date.now()) {
      await this.wsRepo.update(w.id, { subscriptionStatus: 'expired' });
      throw new HttpException(
        { message: 'Trial expirado. Assine um plano para continuar.', code: 'subscription_expired' },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    if (w.subscriptionStatus === 'expired' || w.subscriptionStatus === 'canceled') {
      throw new HttpException(
        { message: 'Assinatura inativa. Assine um plano para continuar.', code: 'subscription_expired' },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
