import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LeadsService } from '../leads.service';
import { TenantContext } from '../../common/tenant/tenant-context.service';

interface LeadMovedEvent {
  workspaceId: string;
  lead: { id: string };
}

interface LeadStatusChangedEvent {
  workspaceId: string;
  leadId: string;
  previousStatus: string;
  newStatus: string;
}

/**
 * Auto-recalcula o score do lead em eventos chave (move e statusChanged).
 * Restabelece o CLS via tenant.run pois listeners async perdem o contexto
 * da request original.
 */
@Injectable()
export class LeadScoreRecalculator {
  private readonly logger = new Logger(LeadScoreRecalculator.name);

  constructor(
    private readonly leads: LeadsService,
    private readonly tenant: TenantContext,
  ) {}

  @OnEvent('lead.moved', { async: true })
  async onLeadMoved(payload: LeadMovedEvent): Promise<void> {
    if (!payload?.workspaceId || !payload?.lead?.id) return;
    await this.recalc(payload.workspaceId, payload.lead.id, 'lead.moved');
  }

  @OnEvent('lead.statusChanged', { async: true })
  async onStatusChanged(payload: LeadStatusChangedEvent): Promise<void> {
    if (!payload?.workspaceId || !payload?.leadId) return;
    await this.recalc(payload.workspaceId, payload.leadId, 'lead.statusChanged');
  }

  private async recalc(workspaceId: string, leadId: string, source: string): Promise<void> {
    try {
      await this.tenant.run(workspaceId, undefined, async () => {
        const result = await this.leads.recalculateScoreSystem(leadId);
        if (result) {
          this.logger.debug(
            `auto-recalc score=${result.score} lead=${leadId} source=${source}`,
          );
        }
      });
    } catch (err: any) {
      this.logger.warn(
        `auto-recalc failed lead=${leadId} source=${source}: ${err?.message}`,
      );
    }
  }
}
