import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Automation } from './entities/automation.entity';
import { AutomationExecution } from './entities/automation-execution.entity';
import { QUEUE_AUTOMATION } from '../common/queues/queues.module';

@Injectable()
export class AutomationTriggerListener {
  private logger = new Logger(AutomationTriggerListener.name);

  constructor(
    @InjectRepository(Automation) private auto: Repository<Automation>,
    @InjectRepository(AutomationExecution) private exec: Repository<AutomationExecution>,
    @InjectQueue(QUEUE_AUTOMATION) private queue: Queue,
  ) {}

  @OnEvent('lead.moved')
  onMoved(evt: { lead: { id: string }; newStageId: string }): Promise<void> {
    return this.maybeTrigger(evt.newStageId, evt.lead.id);
  }

  @OnEvent('lead.created')
  onCreated(evt: { lead: { id: string }; stageId: string }): Promise<void> {
    return this.maybeTrigger(evt.stageId, evt.lead.id);
  }

  private async maybeTrigger(stageId: string, leadId: string): Promise<void> {
    const automation = await this.auto.findOne({ where: { stageId, active: true } });
    if (!automation) return;

    try {
      await this.exec.insert({ automationId: automation.id, leadId });
    } catch (err) {
      if (err instanceof QueryFailedError) {
        this.logger.debug(`Automation ${automation.id} already executed for lead ${leadId}`);
        return;
      }
      throw err;
    }

    await this.queue.add(
      'send',
      { automationId: automation.id, leadId },
      { delay: automation.delayMinutes * 60 * 1000 },
    );
  }
}
