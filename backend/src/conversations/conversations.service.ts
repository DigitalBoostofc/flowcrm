import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation) private repo: Repository<Conversation>,
  ) {}

  async findOrCreate(leadId: string, channelType: string, externalId?: string): Promise<Conversation> {
    const existing = await this.repo.findOne({ where: { leadId, channelType } });
    if (existing) return existing;
    const conv = this.repo.create({ leadId, channelType, externalId });
    return this.repo.save(conv);
  }

  create(dto: CreateConversationDto): Promise<Conversation> {
    return this.findOrCreate(dto.leadId, dto.channelType, dto.externalId);
  }

  findByLead(leadId: string): Promise<Conversation[]> {
    return this.repo.find({ where: { leadId }, order: { createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<Conversation> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Conversa não encontrada');
    return c;
  }
}
