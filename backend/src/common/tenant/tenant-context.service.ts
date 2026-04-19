import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

export const TENANT_CLS_KEY = 'workspaceId';
export const USER_CLS_KEY = 'userId';

@Injectable()
export class TenantContext {
  constructor(private readonly cls: ClsService) {}

  getWorkspaceId(): string | undefined {
    return this.cls.get<string>(TENANT_CLS_KEY);
  }

  requireWorkspaceId(): string {
    const id = this.getWorkspaceId();
    if (!id) throw new UnauthorizedException('Workspace não identificado');
    return id;
  }

  getUserId(): string | undefined {
    return this.cls.get<string>(USER_CLS_KEY);
  }

  run<T>(workspaceId: string, userId: string | undefined, fn: () => T): T {
    return this.cls.run(() => {
      this.cls.set(TENANT_CLS_KEY, workspaceId);
      if (userId !== undefined) this.cls.set(USER_CLS_KEY, userId);
      return fn();
    });
  }
}
