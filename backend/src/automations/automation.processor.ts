import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Automation } from './entities/automation.entity';
import { AutomationExecution } from './entities/automation-execution.entity';
import {
  AutomationStep,
  WaitStepConfig,
  FilterStepConfig,
  FilterCondition,
  SendWhatsappStepConfig,
} from './entities/automation-step.entity';
import { LeadsService } from '../leads/leads.service';
import { TemplatesService } from '../templates/templates.service';
import { ChannelsService } from '../channels/channels.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { interpolate } from '../channels/interpolation.util';
import { QUEUE_AUTOMATION } from '../common/queues/queues.module';

interface StepJobData {
  automationId: string;
  leadId: string;
  stepPosition: number;
}

@Processor(QUEUE_AUTOMATION, { limiter: { max: 20, duration: 60000 } })
export class AutomationProcessor extends WorkerHost {
  private logger = new Logger(AutomationProcessor.name);

  constructor(
    @InjectRepository(Automation) private auto: Repository<Automation>,
    @InjectRepository(AutomationExecution) private exec: Repository<AutomationExecution>,
    @InjectQueue(QUEUE_AUTOMATION) private queue: Queue,
    private leads: LeadsService,
    private templates: TemplatesService,
    private channels: ChannelsService,
    private conversations: ConversationsService,
    private messages: MessagesService,
  ) {
    super();
  }

  async process(job: Job<StepJobData>): Promise<void> {
    const { automationId, leadId, stepPosition } = job.data;

    const automation = await this.auto.findOne({
      where: { id: automationId },
      relations: ['steps'],
    });
    if (!automation || !automation.active) return;

    const steps = (automation.steps ?? []).slice().sort((a, b) => a.position - b.position);
    let pos = stepPosition;
    let accumulatedDelayMs = 0;

    while (pos < steps.length) {
      const step = steps[pos];

      if (step.type === 'wait') {
        accumulatedDelayMs += this.computeWaitMs(step.config as WaitStepConfig);
        pos++;
        continue;
      }

      if (accumulatedDelayMs > 0) {
        await this.queue.add(
          'step',
          { automationId, leadId, stepPosition: pos },
          { delay: accumulatedDelayMs },
        );
        await this.exec.update({ automationId, leadId }, { currentStepPosition: pos });
        return;
      }

      if (step.type === 'filter') {
        const pass = await this.evalFilter(step.config as FilterStepConfig, leadId);
        if (!pass) {
          await this.exec.update(
            { automationId, leadId },
            { status: 'filtered', currentStepPosition: pos },
          );
          this.logger.log(`Automation ${automationId} filtered out for lead ${leadId} at step ${pos}`);
          return;
        }
      } else if (step.type === 'send_whatsapp') {
        await this.sendWhatsapp(step.config as SendWhatsappStepConfig, leadId, automationId);
      }

      pos++;
    }

    await this.exec.update(
      { automationId, leadId },
      { status: 'completed', currentStepPosition: pos },
    );
  }

  private computeWaitMs(cfg: WaitStepConfig): number {
    const amount = Number(cfg?.amount ?? 0);
    if (!amount || amount < 0) return 0;
    const unitMs =
      cfg.unit === 'hours' ? 60 * 60 * 1000 :
      cfg.unit === 'days' ? 24 * 60 * 60 * 1000 :
      60 * 1000;
    return amount * unitMs;
  }

  private async evalFilter(cfg: FilterStepConfig, leadId: string): Promise<boolean> {
    const lead = await this.leads.findOne(leadId);
    const conditions = cfg?.conditions ?? [];
    if (conditions.length === 0) return true;

    const results = conditions.map((c) => this.evalCondition(c, lead));
    return cfg?.logic === 'or' ? results.some(Boolean) : results.every(Boolean);
  }

  private evalCondition(c: FilterCondition, lead: any): boolean {
    let raw: unknown;
    if (c.target === 'lead') raw = lead?.[c.field];
    else if (c.target === 'contact') raw = lead?.contact?.[c.field];
    else if (c.target === 'company') raw = lead?.company?.[c.field] ?? lead?.contact?.company?.[c.field];

    const isEmpty = raw == null || raw === '';

    switch (c.operator) {
      case 'empty': return isEmpty;
      case 'not_empty': return !isEmpty;
      case 'eq': return String(raw ?? '') === String(c.value ?? '');
      case 'neq': return String(raw ?? '') !== String(c.value ?? '');
      case 'contains': return String(raw ?? '').toLowerCase().includes(String(c.value ?? '').toLowerCase());
      case 'not_contains': return !String(raw ?? '').toLowerCase().includes(String(c.value ?? '').toLowerCase());
      case 'gt': return Number(raw ?? 0) > Number(c.value ?? 0);
      case 'lt': return Number(raw ?? 0) < Number(c.value ?? 0);
      case 'gte': return Number(raw ?? 0) >= Number(c.value ?? 0);
      case 'lte': return Number(raw ?? 0) <= Number(c.value ?? 0);
      default: return false;
    }
  }

  private async sendWhatsapp(
    cfg: SendWhatsappStepConfig,
    leadId: string,
    automationId: string,
  ): Promise<void> {
    if (!cfg?.channelId || !cfg?.templateId) {
      this.logger.warn(`Automation ${automationId} missing channel/template config`);
      return;
    }

    const lead = await this.leads.findOne(leadId);
    const template = await this.templates.findOne(cfg.templateId);

    const vars = {
      nome: lead.contact?.name ?? '',
      agente: lead.assignedTo?.name ?? '',
      pipeline: lead.pipeline?.name ?? '',
      etapa: lead.stage?.name ?? '',
    };
    const body = interpolate(template.body, vars);

    const phone = lead.contact?.phone ?? '';
    if (!phone) {
      this.logger.warn(`Lead ${lead.id} has no phone — skipping send`);
      return;
    }

    const conv = await this.conversations.findOrCreate(lead.id, 'uazapi', phone);
    const result = await this.channels.send({
      channelConfigId: cfg.channelId,
      to: phone,
      body,
    });

    await this.messages.saveOutbound({
      conversationId: conv.id,
      body,
      status: result.status,
      externalMessageId: result.externalMessageId,
    });

    this.logger.log(`Automation ${automationId} sent WhatsApp for lead ${lead.id}: ${result.status}`);
  }
}
