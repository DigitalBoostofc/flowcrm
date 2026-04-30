import { Test, TestingModule } from '@nestjs/testing';
import { LeadScoreRecalculator } from './lead-score-recalculator';
import { LeadsService } from '../leads.service';
import { TenantContext } from '../../common/tenant/tenant-context.service';

describe('LeadScoreRecalculator', () => {
  let recalc: LeadScoreRecalculator;
  let leadsService: { recalculateScoreSystem: jest.Mock };
  let tenant: { run: jest.Mock };

  beforeEach(async () => {
    leadsService = { recalculateScoreSystem: jest.fn().mockResolvedValue({ score: 75, factors: {} }) };
    tenant = { run: jest.fn().mockImplementation(async (_ws, _uid, fn) => fn()) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadScoreRecalculator,
        { provide: LeadsService, useValue: leadsService },
        { provide: TenantContext, useValue: tenant },
      ],
    }).compile();
    recalc = module.get(LeadScoreRecalculator);
  });

  describe('onLeadMoved', () => {
    it('calls recalculateScoreSystem inside tenant.run', async () => {
      await recalc.onLeadMoved({ workspaceId: 'ws-1', lead: { id: 'lead-1' } });
      expect(tenant.run).toHaveBeenCalledWith('ws-1', undefined, expect.any(Function));
      expect(leadsService.recalculateScoreSystem).toHaveBeenCalledWith('lead-1');
    });

    it('skips when workspaceId missing', async () => {
      await recalc.onLeadMoved({ workspaceId: '', lead: { id: 'lead-1' } } as any);
      expect(tenant.run).not.toHaveBeenCalled();
    });

    it('skips when lead.id missing', async () => {
      await recalc.onLeadMoved({ workspaceId: 'ws-1', lead: {} } as any);
      expect(tenant.run).not.toHaveBeenCalled();
    });

    it('does not throw when recalculateScoreSystem rejects', async () => {
      leadsService.recalculateScoreSystem.mockRejectedValueOnce(new Error('boom'));
      await expect(recalc.onLeadMoved({ workspaceId: 'ws-1', lead: { id: 'lead-1' } })).resolves.toBeUndefined();
    });
  });

  describe('onStatusChanged', () => {
    it('calls recalculateScoreSystem inside tenant.run', async () => {
      await recalc.onStatusChanged({
        workspaceId: 'ws-1',
        leadId: 'lead-1',
        previousStatus: 'active',
        newStatus: 'won',
      });
      expect(tenant.run).toHaveBeenCalledWith('ws-1', undefined, expect.any(Function));
      expect(leadsService.recalculateScoreSystem).toHaveBeenCalledWith('lead-1');
    });

    it('skips when leadId missing', async () => {
      await recalc.onStatusChanged({ workspaceId: 'ws-1' } as any);
      expect(tenant.run).not.toHaveBeenCalled();
    });

    it('does not throw when recalculateScoreSystem returns null (lead not found)', async () => {
      leadsService.recalculateScoreSystem.mockResolvedValueOnce(null);
      await expect(
        recalc.onStatusChanged({
          workspaceId: 'ws-1',
          leadId: 'lead-x',
          previousStatus: 'active',
          newStatus: 'lost',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
