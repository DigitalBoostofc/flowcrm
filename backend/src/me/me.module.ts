import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Company } from '../companies/entities/company.entity';
import { Product } from '../products/entities/product.entity';
import { MeService } from './me.service';
import { MeController } from './me.controller';
import { AccountPruneScheduler } from './account-prune.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([User, Workspace, Lead, Contact, Company, Product])],
  controllers: [MeController],
  providers: [MeService, AccountPruneScheduler],
  exports: [MeService],
})
export class MeModule {}
