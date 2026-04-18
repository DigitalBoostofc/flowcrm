import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '../contacts/entities/contact.entity';
import { Lead } from '../leads/entities/lead.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Lead])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
