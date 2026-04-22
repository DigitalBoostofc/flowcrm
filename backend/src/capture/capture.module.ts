import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Company } from '../companies/entities/company.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Stage } from '../stages/entities/stage.entity';
import { CaptureController } from './capture.controller';
import { CaptureService } from './capture.service';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace, Contact, Company, Lead, Stage])],
  controllers: [CaptureController],
  providers: [CaptureService],
})
export class CaptureModule {}
