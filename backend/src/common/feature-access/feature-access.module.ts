import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Plan } from '../../subscriptions/entities/plan.entity';
import { FeatureAccessService } from './feature-access.service';
import { FeatureGuard } from './feature.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Workspace, Plan])],
  providers: [FeatureAccessService, FeatureGuard],
  exports: [FeatureAccessService, FeatureGuard],
})
export class FeatureAccessModule {}
