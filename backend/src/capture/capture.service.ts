import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace, WidgetConfig } from '../workspaces/entities/workspace.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Company } from '../companies/entities/company.entity';
import { Lead, LeadStatus } from '../leads/entities/lead.entity';
import { Stage } from '../stages/entities/stage.entity';

type CaptureData = {
  name: string;
  phone: string;
  email?: string;
  message?: string;
  contactType?: 'fisica' | 'juridica';
};

@Injectable()
export class CaptureService {
  constructor(
    @InjectRepository(Workspace) private workspaces: Repository<Workspace>,
    @InjectRepository(Contact)  private contacts: Repository<Contact>,
    @InjectRepository(Company)  private companies: Repository<Company>,
    @InjectRepository(Lead)     private leads: Repository<Lead>,
    @InjectRepository(Stage)    private stages: Repository<Stage>,
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
    data: CaptureData,
  ): Promise<{ ok: boolean; whatsappNumber: string | null }> {
    const ws = await this.workspaces.findOne({ where: { id: workspaceId } });
    if (!ws) throw new NotFoundException('Workspace não encontrado');
    if (!ws.widgetConfig?.enabled) throw new BadRequestException('Widget desabilitado');

    const cfg = ws.widgetConfig;
    const isJuridica = data.contactType === 'juridica';

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

    let contactId: string | null = null;
    let companyId: string | null = null;

    if (isJuridica) {
      const existing = await this.companies.findOne({ where: { name: data.name, workspaceId } });
      if (existing) {
        companyId = existing.id;
      } else {
        const company = await this.companies.save(
          this.companies.create({
            workspaceId,
            name: data.name,
            whatsapp: data.phone || null,
            email: data.email || null,
          } as any),
        );
        companyId = (company as any).id;
      }
    } else {
      const existing = await this.contacts.findOne({ where: { phone: data.phone, workspaceId } });
      if (existing) {
        contactId = existing.id;
      } else {
        const contact = await this.contacts.save(
          this.contacts.create({
            workspaceId,
            name: data.name,
            phone: data.phone,
            email: data.email || null,
          } as any),
        );
        contactId = (contact as any).id;
      }
    }

    await this.leads.save(
      this.leads.create({
        workspaceId,
        contactId,
        companyId,
        title,
        status: LeadStatus.ACTIVE,
        pipelineId: cfg.pipelineId ?? null,
        stageId: stageId ?? null,
        assignedToId: cfg.assignToId ?? null,
        stageEnteredAt: new Date(),
      } as any),
    );

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
