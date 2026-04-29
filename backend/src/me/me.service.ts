import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '../users/entities/user.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Company } from '../companies/entities/company.entity';
import { Product } from '../products/entities/product.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

export interface DataExport {
  exportedAt: Date;
  user: Omit<User, 'passwordHash' | 'leads'>;
  workspace: Workspace | null;
  leads: Lead[];
  contacts: Contact[];
  companies: Company[];
  products: Product[];
}

@Injectable()
export class MeService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Workspace) private readonly workspaces: Repository<Workspace>,
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly tenant: TenantContext,
    private readonly config: ConfigService,
  ) {}

  /**
   * LGPD art. 18, II — direito de portabilidade. Returns the user's full data
   * footprint. Includes soft-deleted rows with `deletedAt` flagged so the
   * subject sees what's still on us during the grace window.
   */
  async exportData(userId: string): Promise<DataExport> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    const workspaceId = user.workspaceId;

    const [workspace, leads, contacts, companies, products] = await Promise.all([
      this.workspaces.findOne({ where: { id: workspaceId } }),
      this.leads.find({ where: { workspaceId }, withDeleted: true }),
      this.contacts.find({ where: { workspaceId }, withDeleted: true }),
      this.companies.find({ where: { workspaceId }, withDeleted: true }),
      this.products.find({ where: { workspaceId }, withDeleted: true }),
    ]);

    const { passwordHash: _ph, ...safeUser } = user as User & { passwordHash?: string };
    return {
      exportedAt: new Date(),
      user: safeUser as DataExport['user'],
      workspace,
      leads,
      contacts,
      companies,
      products,
    };
  }

  /**
   * LGPD art. 18, V — direito ao esquecimento. Marks the account for deletion
   * after a grace window (env ACCOUNT_RETENTION_DAYS, default 30). The cron
   * does the actual erase. Owner cannot self-delete unless the workspace has
   * no other users — they must transfer ownership or cancel the subscription.
   */
  async scheduleAccountDeletion(userId: string): Promise<{ scheduledDeletionAt: Date }> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.role === UserRole.OWNER) {
      const otherUsers = await this.users.count({
        where: { workspaceId: user.workspaceId },
      });
      if (otherUsers > 1) {
        throw new ConflictException(
          'Você é o proprietário do workspace. Transfira a propriedade para outro usuário ou cancele a assinatura antes de excluir sua conta.',
        );
      }
    }

    const days = this.config.get<number>('ACCOUNT_RETENTION_DAYS', 30);
    const scheduledDeletionAt = new Date(Date.now() + days * 86_400_000);
    await this.users.update(userId, { scheduledDeletionAt });
    return { scheduledDeletionAt };
  }

  /** Cancela uma exclusão pendente. Chamado via fluxo de "reativação" do usuário. */
  async cancelAccountDeletion(userId: string): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!user.scheduledDeletionAt) {
      throw new BadRequestException('Conta não está marcada para exclusão');
    }
    await this.users.update(userId, { scheduledDeletionAt: null });
  }
}
