import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository, IsNull, Not } from 'typeorm';
import { Lead } from '../leads/entities/lead.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Company } from '../companies/entities/company.entity';
import { Product } from '../products/entities/product.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

export type TrashType = 'leads' | 'contacts' | 'companies' | 'products';
export const TRASH_TYPES: TrashType[] = ['leads', 'contacts', 'companies', 'products'];

export interface TrashItem {
  type: TrashType;
  id: string;
  label: string;
  deletedAt: Date;
  /** Nº de dias restantes antes do purge automático. */
  daysUntilPurge: number;
}

interface RepoEntry {
  // Generic repo — caller must own type narrowing per-method.
  repo: Repository<{ id: string; workspaceId: string; deletedAt: Date | null }>;
  /** Pick a human-readable label from the entity for the trash UI. */
  label: (e: any) => string;
}

@Injectable()
export class TrashService {
  private readonly registry: Record<TrashType, RepoEntry>;

  constructor(
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly tenant: TenantContext,
  ) {
    this.registry = {
      leads:     { repo: leads as any,     label: (l: Lead) => l.title || `Lead ${l.id.slice(0, 8)}` },
      contacts:  { repo: contacts as any,  label: (c: Contact) => c.name || `Contato ${c.id.slice(0, 8)}` },
      companies: { repo: companies as any, label: (c: Company) => c.name || `Empresa ${c.id.slice(0, 8)}` },
      products:  { repo: products as any,  label: (p: Product) => p.name || `Produto ${p.id.slice(0, 8)}` },
    };
  }

  private entry(type: string): RepoEntry {
    if (!(TRASH_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestException(`Tipo de lixeira inválido: ${type}`);
    }
    return this.registry[type as TrashType];
  }

  async listAll(retentionDays: number): Promise<Record<TrashType, TrashItem[]>> {
    const out = {} as Record<TrashType, TrashItem[]>;
    for (const type of TRASH_TYPES) {
      out[type] = await this.list(type, retentionDays);
    }
    return out;
  }

  async list(type: TrashType, retentionDays: number): Promise<TrashItem[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const { repo, label } = this.entry(type);
    const rows = await repo.find({
      where: { workspaceId, deletedAt: Not(IsNull()) } as any,
      withDeleted: true,
      order: { deletedAt: 'DESC' } as any,
      take: 500,
    });
    const now = Date.now();
    return rows.map((row: any) => {
      const deletedAt = new Date(row.deletedAt as Date);
      const ageMs = now - deletedAt.getTime();
      const daysElapsed = Math.floor(ageMs / 86_400_000);
      const daysUntilPurge = Math.max(0, retentionDays - daysElapsed);
      return { type, id: row.id, label: label(row), deletedAt, daysUntilPurge };
    });
  }

  async restore(type: TrashType, id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const { repo } = this.entry(type);
    const result = await repo.restore({ id, workspaceId } as any);
    if (!result.affected) throw new NotFoundException('Item não encontrado na lixeira');
  }

  async purgeOne(type: TrashType, id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const { repo } = this.entry(type);
    // Hard-delete only items already soft-deleted — never bypass the trash flow.
    const row = await repo.findOne({
      where: { id, workspaceId, deletedAt: Not(IsNull()) } as any,
      withDeleted: true,
    });
    if (!row) throw new NotFoundException('Item não encontrado na lixeira');
    await repo.delete({ id, workspaceId } as any);
  }

  /**
   * Cron entry-point: hard-deletes any soft-deleted row across all trash types
   * whose deletedAt is older than `retentionDays`. Workspace-agnostic.
   */
  async purgeOlderThan(retentionDays: number): Promise<Record<TrashType, number>> {
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
    const out = {} as Record<TrashType, number>;
    for (const type of TRASH_TYPES) {
      const { repo } = this.registry[type];
      const result = await repo
        .createQueryBuilder()
        .delete()
        .where('"deletedAt" IS NOT NULL AND "deletedAt" < :cutoff', { cutoff })
        .execute();
      out[type] = result.affected ?? 0;
    }
    return out;
  }
}
