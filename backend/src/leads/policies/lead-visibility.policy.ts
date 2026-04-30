import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Lead, LeadPrivacy } from '../entities/lead.entity';
import { UserRole } from '../../users/entities/user.entity';

export interface LeadVisibilityContext {
  userId?: string;
  role?: string;
  workspaceId: string;
}

type LeadVisibilityFields = Pick<
  Lead,
  'workspaceId' | 'privacy' | 'createdById' | 'assignedToId' | 'additionalAccessUserIds'
>;

export class LeadVisibilityPolicy {
  static isPrivileged(role?: string): boolean {
    return role === UserRole.OWNER || role === UserRole.MANAGER;
  }

  static canRead(lead: LeadVisibilityFields, ctx: LeadVisibilityContext): boolean {
    if (lead.workspaceId !== ctx.workspaceId) return false;
    if (this.isPrivileged(ctx.role)) return true;
    if (!ctx.userId) return false;
    if (lead.privacy === LeadPrivacy.ALL) return true;
    if (lead.createdById === ctx.userId) return true;
    if (lead.assignedToId === ctx.userId) return true;
    if (Array.isArray(lead.additionalAccessUserIds) && lead.additionalAccessUserIds.includes(ctx.userId)) {
      return true;
    }
    return false;
  }

  static applyToQueryBuilder<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    ctx: LeadVisibilityContext,
  ): SelectQueryBuilder<T> {
    if (this.isPrivileged(ctx.role)) return qb;
    if (!ctx.userId) {
      return qb.andWhere('1 = 0');
    }
    const uid = ctx.userId;
    return qb.andWhere(
      new Brackets((qb2) => {
        qb2
          .where(`${alias}.privacy = :lvp_all`, { lvp_all: LeadPrivacy.ALL })
          .orWhere(`${alias}.createdById = :lvp_uid`, { lvp_uid: uid })
          .orWhere(`${alias}.assignedToId = :lvp_uid`, { lvp_uid: uid })
          .orWhere(`${alias}.additionalAccessUserIds @> :lvp_uidJson::jsonb`, {
            lvp_uidJson: JSON.stringify([uid]),
          });
      }),
    );
  }
}
