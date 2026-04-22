import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace, WidgetConfig } from '../workspaces/entities/workspace.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Lead, LeadStatus } from '../leads/entities/lead.entity';
import { Stage } from '../stages/entities/stage.entity';

@Injectable()
export class CaptureService {
  constructor(
    @InjectRepository(Workspace) private workspaces: Repository<Workspace>,
    @InjectRepository(Contact) private contacts: Repository<Contact>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(Stage) private stages: Repository<Stage>,
  ) {}

  async getPublicConfig(workspaceId: string): Promise<{ config: WidgetConfig; workspaceName: string } | null> {
    const ws = await this.workspaces.findOne({ where: { id: workspaceId } });
    if (!ws || !ws.widgetConfig?.enabled) return null;
    return { config: ws.widgetConfig, workspaceName: ws.name };
  }

  async getPrivateConfig(workspaceId: string): Promise<WidgetConfig | null> {
    const ws = await this.workspaces.findOne({ where: { id: workspaceId } });
    return ws?.widgetConfig ?? null;
  }

  async capture(
    workspaceId: string,
    data: { name: string; phone: string; email?: string; message?: string },
  ): Promise<{ ok: boolean; whatsappNumber: string | null }> {
    const ws = await this.workspaces.findOne({ where: { id: workspaceId } });
    if (!ws) throw new NotFoundException('Workspace não encontrado');
    if (!ws.widgetConfig?.enabled) throw new BadRequestException('Widget desabilitado');

    const cfg = ws.widgetConfig;

    const found = await this.contacts.findOne({ where: { phone: data.phone, workspaceId } });
    let contact: Contact;
    if (found) {
      contact = found;
    } else {
      contact = (await this.contacts.save(
        this.contacts.create({ workspaceId, name: data.name, phone: data.phone, email: data.email || null } as any),
      )) as unknown as Contact;
    }

    let stageId = cfg.stageId;
    if (!stageId && cfg.pipelineId) {
      const firstStage = await this.stages.findOne({
        where: { pipelineId: cfg.pipelineId, workspaceId },
        order: { position: 'ASC' },
      });
      stageId = firstStage?.id ?? null;
    }

    const title = data.message?.trim()
      ? data.message.substring(0, 60)
      : `Lead via widget — ${data.name}`;

    const lead = this.leads.create({
      workspaceId,
      contactId: contact.id,
      title,
      status: LeadStatus.ACTIVE,
      pipelineId: cfg.pipelineId ?? null,
      stageId: stageId ?? null,
      assignedToId: cfg.assignToId ?? null,
      stageEnteredAt: new Date(),
    } as any);
    await this.leads.save(lead);

    return { ok: true, whatsappNumber: cfg.whatsappNumber || null };
  }

  async updateConfig(workspaceId: string, config: WidgetConfig): Promise<WidgetConfig> {
    const ws = await this.workspaces.findOne({ where: { id: workspaceId } });
    if (!ws) throw new NotFoundException('Workspace não encontrado');
    ws.widgetConfig = config;
    await this.workspaces.save(ws);
    return config;
  }
}
