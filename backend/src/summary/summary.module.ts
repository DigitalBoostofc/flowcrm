import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../leads/entities/lead.entity';
import { User } from '../users/entities/user.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { SummaryService } from './summary.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, User, Workspace])],
  providers: [SummaryService],
})
export class SummaryModule {}
