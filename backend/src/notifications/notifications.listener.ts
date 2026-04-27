import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from './notifications.gateway';

interface LeadShape {
  id?: string;
  workspaceId?: string;
  assignedToId?: string | null;
}

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private gateway: NotificationsGateway) {}

  private extractWorkspaceId(evt: { workspaceId?: string; lead?: LeadShape }): string | null {
    return evt.workspaceId ?? evt.lead?.workspaceId ?? null;
  }

  @OnEvent('message.received')
  onMessageReceived(evt: { message: unknown; lead: LeadShape; conversation: unknown; isNewLead?: boolean; workspaceId?: string }) {
    const workspaceId = this.extractWorkspaceId(evt);
    if (!workspaceId) {
      this.logger.warn('message.received event without workspaceId — dropping notification');
      return;
    }
    this.gateway.emitToWorkspaceOwners(workspaceId, 'message.received', evt);
    if (evt.lead.assignedToId) {
      this.gateway.emitToWorkspaceUser(workspaceId, evt.lead.assignedToId, 'message.received', evt);
    }
  }

  @OnEvent('lead.moved')
  onLeadMoved(evt: { lead: LeadShape; previousStageId: string; newStageId: string; workspaceId?: string }) {
    const workspaceId = this.extractWorkspaceId(evt);
    if (!workspaceId) return;
    this.gateway.emitToWorkspaceOwners(workspaceId, 'lead.moved', evt);
  }

  @OnEvent('lead.created')
  onLeadCreated(evt: { lead: LeadShape; stageId: string; workspaceId?: string }) {
    const workspaceId = this.extractWorkspaceId(evt);
    if (!workspaceId) return;
    this.gateway.emitToWorkspaceOwners(workspaceId, 'lead.created', evt);
    if (evt.lead.assignedToId) {
      this.gateway.emitToWorkspaceUser(workspaceId, evt.lead.assignedToId, 'lead.created', evt);
    }
  }

  @OnEvent('lead.assigned')
  onLeadAssigned(evt: { lead: LeadShape; workspaceId?: string }) {
    const workspaceId = this.extractWorkspaceId(evt);
    if (!workspaceId) return;
    this.gateway.emitToWorkspaceOwners(workspaceId, 'lead.assigned', evt);
    if (evt.lead.assignedToId) {
      this.gateway.emitToWorkspaceUser(workspaceId, evt.lead.assignedToId, 'lead.assigned', evt);
    }
  }

  @OnEvent('channel.status.changed')
  onChannelStatusChanged(evt: { channelConfigId: string; status: string; workspaceId?: string }) {
    if (!evt.workspaceId) {
      this.logger.warn(`channel.status.changed without workspaceId — channel ${evt.channelConfigId}`);
      return;
    }
    this.gateway.emitToWorkspaceOwners(evt.workspaceId, 'channel.status.changed', evt);
  }

  @OnEvent('job.failed')
  onJobFailed(evt: { queue: string; jobId: string; error: string; workspaceId?: string }) {
    if (!evt.workspaceId) {
      this.logger.debug(`job.failed without workspaceId — not broadcast (jobId=${evt.jobId})`);
      return;
    }
    this.gateway.emitToWorkspaceOwners(evt.workspaceId, 'job.failed', evt);
  }
}
