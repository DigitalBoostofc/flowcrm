import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { WorkspaceAiSettings } from './entities/workspace-ai-settings.entity';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { AiSettingsService } from './ai-settings.service';
import { CryptoModule } from '../common/crypto/crypto.module';
import { FeatureAccessModule } from '../common/feature-access/feature-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, WorkspaceAiSettings]),
    CryptoModule,
    FeatureAccessModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService, AiSettingsService],
  exports: [AgentsService, AiSettingsService],
})
export class AgentsModule {}
