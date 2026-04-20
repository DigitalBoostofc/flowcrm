import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Label } from './entities/label.entity';
import { Lead } from '../leads/entities/lead.entity';
import { LabelsService } from './labels.service';
import { LabelsController } from './labels.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Label, Lead])],
  controllers: [LabelsController],
  providers: [LabelsService],
  exports: [LabelsService],
})
export class LabelsModule {}
