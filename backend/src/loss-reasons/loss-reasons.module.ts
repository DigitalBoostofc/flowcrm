import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LossReason } from './entities/loss-reason.entity';
import { LossReasonsService } from './loss-reasons.service';
import { LossReasonsController } from './loss-reasons.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LossReason])],
  controllers: [LossReasonsController],
  providers: [LossReasonsService],
})
export class LossReasonsModule {}
