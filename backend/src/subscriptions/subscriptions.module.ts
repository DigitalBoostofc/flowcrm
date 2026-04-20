import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController, PlatformPlansController } from './subscriptions.controller';
import { Plan } from './entities/plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace, Plan])],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController, PlatformPlansController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
