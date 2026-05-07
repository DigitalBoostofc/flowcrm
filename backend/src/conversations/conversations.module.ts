import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { Conversation } from './entities/conversation.entity';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadsModule } from '../leads/leads.module';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation]),
    ContactsModule,
    LeadsModule,
    PipelinesModule,
    CompaniesModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
