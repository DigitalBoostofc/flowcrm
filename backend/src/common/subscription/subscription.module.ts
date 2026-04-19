import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { SubscriptionGuard } from './subscription.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Workspace])],
  providers: [
    SubscriptionGuard,
    { provide: APP_GUARD, useClass: SubscriptionGuard },
  ],
  exports: [SubscriptionGuard],
})
export class SubscriptionModule {}
