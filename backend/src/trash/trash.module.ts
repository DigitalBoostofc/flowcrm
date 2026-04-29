import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../leads/entities/lead.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Company } from '../companies/entities/company.entity';
import { Product } from '../products/entities/product.entity';
import { TrashService } from './trash.service';
import { TrashController } from './trash.controller';
import { TrashPruneScheduler } from './trash-prune.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Contact, Company, Product])],
  controllers: [TrashController],
  providers: [TrashService, TrashPruneScheduler],
  exports: [TrashService],
})
export class TrashModule {}
