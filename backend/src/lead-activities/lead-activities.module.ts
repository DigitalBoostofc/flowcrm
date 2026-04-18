import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadActivitiesController } from './lead-activities.controller';
import { LeadActivitiesService } from './lead-activities.service';
import { LeadActivity } from './entities/lead-activity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LeadActivity])],
  controllers: [LeadActivitiesController],
  providers: [LeadActivitiesService],
})
export class LeadActivitiesModule {}
