export type UserRole = 'owner' | 'agent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  channelOrigin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
  pipelineId: string;
  createdAt: string;
}

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages?: Stage[];
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  contactId: string;
  contact?: Contact;
  stageId: string;
  stage?: Stage;
  pipelineId: string;
  pipeline?: Pipeline;
  assignedToId?: string | null;
  assignedTo?: User | null;
  value?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  leadId: string;
  channelType: string;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  body: string;
  direction: MessageDirection;
  type: 'text';
  status: MessageStatus;
  externalMessageId?: string | null;
  sentAt: string;
  createdAt: string;
}

export interface ChannelConfig {
  id: string;
  name: string;
  type: 'evolution' | 'meta';
  config: Record<string, string>;
  status: 'connected' | 'disconnected' | 'error';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
