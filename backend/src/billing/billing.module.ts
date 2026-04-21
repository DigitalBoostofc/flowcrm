import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Plan } from '../subscriptions/entities/plan.entity';
import { User } from '../users/entities/user.entity';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeProvider } from './stripe.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace, Plan, User])],
  providers: [BillingService, StripeProvider],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}
