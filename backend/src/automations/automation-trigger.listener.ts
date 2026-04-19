import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Automation } from './entities/automation.entity';
import { AutomationExecution } from './entities/automation-execution.entity';
import { QUEUE_AUTOMATION } from '../common/queues/queues.module';
import { Stage } from '../stages/entities/stage.entity';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class AutomationTriggerListener {
  private logger = new Logger(AutomationTriggerListener.name);

  constructor(
    @InjectRepository(Automation) private auto: Repository<Automation>,
    @InjectRepository(AutomationExecution) private exec: Repository<AutomationExecution>,
    @InjectRepository(Stage) private stageRepo: Repository<Stage>,
    @InjectQueue(QUEUE_AUTOMATION) private queue: Queue,
    private readonly tenant: TenantContext,
  ) {}

  @OnEvent('lead.moved')
  async onMoved(evt: {
    lead: { id: string; pipelineId: string };
    previousStageId: string;
    newStageId: string;
  }): Promise<void> {
    const prevStage = await this.stageRepo.findOne({ where: { id: evt.previousStageId } });
    const newStage = await this.stageRepo.findOne({ where: { id: evt.newStageId } });

    await this.fireStageTriggers(evt.newStageId, evt.lead.id);

    if (newStage && (!prevStage || prevStage.pipelineId !== newStage.pipelineId)) {
      await this.firePipelineTriggers(newStage.pipelineId, evt.lead.id);
    }
  }

  @OnEvent('lead.created')
  async onCreated(evt: { lead: { id: string; pipelineId: string }; stageId: string }): Promise<void> {
    await this.fireStageTriggers(evt.stageId, evt.lead.id);
    if (evt.lead.pipelineId) {
      await this.firePipelineTriggers(evt.lead.pipelineId, evt.lead.id);
    }
  }

  private async fireStageTriggers(stageId: string, leadId: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const list = await this.auto.find({
      where: { workspaceId, stageId, triggerType: 'stage', active: true },
    });
    for (const a of list) await this.enqueue(a.id, leadId, workspaceId);
  }

  private async firePipelineTriggers(pipelineId: string, leadId: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const list = await this.auto.find({
      where: { workspaceId, pipelineId, triggerType: 'pipeline', active: true },
    });
    for (const a of list) await this.enqueue(a.id, leadId, workspaceId);
  }

  private async enqueue(automationId: string, leadId: string, workspaceId: string): Promise<void> {
    try {
      await this.exec.insert({ workspaceId, automationId, leadId, status: 'pending', currentStepPosition: 0 });
    } catch (err) {
      if (err instanceof QueryFailedError) {
        this.logger.debug(`Automation ${automationId} already executed for lead ${leadId}`);
        return;
      }
      throw err;
    }
    await this.queue.add('step', { automationId, leadId, stepPosition: 0 });
  }
}
