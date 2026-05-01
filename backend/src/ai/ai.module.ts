import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceAiUsage } from './entities/workspace-ai-usage.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../messages/entities/message.entity';
import { AiController } from './ai.controller';
import { ConversationSummaryService } from './services/conversation-summary.service';
import { AiUsageService } from './services/ai-usage.service';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { FeatureAccessModule } from '../common/feature-access/feature-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceAiUsage, Conversation, Message]),
    FeatureAccessModule,
  ],
  controllers: [AiController],
  providers: [
    ConversationSummaryService,
    AiUsageService,
    OpenRouterProvider,
    { provide: AI_PROVIDER, useExisting: OpenRouterProvider },
  ],
  exports: [ConversationSummaryService, AiUsageService],
})
export class AiModule {}
