import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerOrigin } from './entities/customer-origin.entity';
import { CustomerOriginsService } from './customer-origins.service';
import { CustomerOriginsController } from './customer-origins.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerOrigin])],
  controllers: [CustomerOriginsController],
  providers: [CustomerOriginsService],
})
export class CustomerOriginsModule {}
