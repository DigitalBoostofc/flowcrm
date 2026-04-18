import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipelinesController } from './pipelines.controller';
import { PipelinesService } from './pipelines.service';
import { Pipeline } from './entities/pipeline.entity';
import { StagesModule } from '../stages/stages.module';

@Module({
  imports: [TypeOrmModule.forFeature([Pipeline]), StagesModule],
  controllers: [PipelinesController],
  providers: [PipelinesService],
  exports: [PipelinesService],
})
export class PipelinesModule {}
