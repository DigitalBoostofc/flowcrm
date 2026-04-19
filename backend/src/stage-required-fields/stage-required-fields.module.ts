import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StageRequiredField } from './entities/stage-required-field.entity';
import { StageRequiredFieldsService } from './stage-required-fields.service';
import { StageRequiredFieldsController } from './stage-required-fields.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StageRequiredField])],
  controllers: [StageRequiredFieldsController],
  providers: [StageRequiredFieldsService],
})
export class StageRequiredFieldsModule {}
