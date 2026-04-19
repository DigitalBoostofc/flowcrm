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

export type LeadStatus = 'active' | 'won' | 'lost';
export type ActivityType = 'note' | 'call' | 'whatsapp' | 'meeting' | 'visit' | 'proposal';

export type ContactPrivacy = 'all' | 'restricted';

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  channelOrigin?: string;
  origin?: string;
  company?: string;
  role?: string;
  website?: string;
  zipCode?: string;
  categoria?: string;
  responsibleId?: string;
  cpf?: string;
  birthDay?: string;
  birthYear?: number;
  origem?: string;
  descricao?: string;
  whatsapp?: string;
  celular?: string;
  fax?: string;
  ramal?: string;
  pais?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  produtos?: string[];
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  skype?: string;
  instagram?: string;
  privacy?: ContactPrivacy;
  additionalAccessUserIds?: string[];
  leads?: Lead[];
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
  createdById?: string | null;
  createdBy?: User | null;
  title?: string | null;
  status: LeadStatus;
  lossReason?: string | null;
  startDate?: string | null;
  conclusionDate?: string | null;
  stageEnteredAt: string;
  value?: number | null;
  ranking?: number | null;
  notes?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: ActivityType;
  body: string;
  createdById?: string;
  createdBy?: User;
  createdAt: string;
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

export type CompanyPrivacy = 'all' | 'restricted';

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  razaoSocial?: string;
  categoria?: string;
  origem?: string;
  setor?: string;
  descricao?: string;
  responsibleId?: string;
  responsible?: User;
  privacy: CompanyPrivacy;
  additionalAccessUserIds: string[];
  email?: string;
  whatsapp?: string;
  telefone?: string;
  celular?: string;
  fax?: string;
  ramal?: string;
  website?: string;
  cep?: string;
  pais?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  produtos: string[];
  pessoaIds: string[];
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  skype?: string;
  instagram?: string;
  ranking?: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskType = 'email' | 'call' | 'whatsapp' | 'proposal' | 'meeting' | 'visit';
export type TaskStatus = 'pending' | 'completed';
export type TaskTargetType = 'contact' | 'lead' | 'company';

export interface TaskAttachment {
  name: string;
  url: string;
}

export interface Task {
  id: string;
  type: TaskType;
  description: string;
  dueDate: string | null;
  status: TaskStatus;
  responsibleIds: string[];
  targetType: TaskTargetType | null;
  targetId: string | null;
  targetLabel: string | null;
  attachments: TaskAttachment[];
  createdById: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
