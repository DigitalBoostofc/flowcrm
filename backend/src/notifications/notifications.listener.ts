import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsListener {
  constructor(private gateway: NotificationsGateway) {}

  @OnEvent('message.received')
  onMessageReceived(evt: { message: unknown; lead: { assignedToId?: string }; conversation: unknown; isNewLead?: boolean }) {
    this.gateway.emitToOwners('message.received', evt);
    if (evt.lead.assignedToId) {
      this.gateway.emitToUser(evt.lead.assignedToId, 'message.received', evt);
    }
  }

  @OnEvent('lead.moved')
  onLeadMoved(evt: { lead: unknown; previousStageId: string; newStageId: string }) {
    this.gateway.emitToOwners('lead.moved', evt);
  }

  @OnEvent('lead.created')
  onLeadCreated(evt: { lead: { assignedToId?: string }; stageId: string }) {
    this.gateway.emitToOwners('lead.created', evt);
    if (evt.lead.assignedToId) {
      this.gateway.emitToUser(evt.lead.assignedToId, 'lead.created', evt);
    }
  }

  @OnEvent('lead.assigned')
  onLeadAssigned(evt: { lead: { assignedToId?: string } }) {
    this.gateway.emitToOwners('lead.assigned', evt);
    if (evt.lead.assignedToId) {
      this.gateway.emitToUser(evt.lead.assignedToId, 'lead.assigned', evt);
    }
  }

  @OnEvent('channel.status.changed')
  onChannelStatusChanged(evt: { channelConfigId: string; status: string }) {
    this.gateway.emitToOwners('channel.status.changed', evt);
  }

  @OnEvent('job.failed')
  onJobFailed(evt: { queue: string; jobId: string; error: string }) {
    this.gateway.emitToOwners('job.failed', evt);
  }
}
