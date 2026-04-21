import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { Lead } from './entities/lead.entity';
import { Stage } from '../stages/entities/stage.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { CustomerOrigin } from '../customer-origins/entities/customer-origin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Stage, Contact, CustomerOrigin])],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
