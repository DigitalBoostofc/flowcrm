import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactActivitiesController } from './contact-activities.controller';
import { ContactActivitiesService } from './contact-activities.service';
import { ContactActivity } from './entities/contact-activity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContactActivity])],
  controllers: [ContactActivitiesController],
  providers: [ContactActivitiesService],
})
export class ContactActivitiesModule {}
