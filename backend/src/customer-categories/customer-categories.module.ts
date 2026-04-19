import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerCategory } from './entities/customer-category.entity';
import { CustomerCategoriesService } from './customer-categories.service';
import { CustomerCategoriesController } from './customer-categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerCategory])],
  controllers: [CustomerCategoriesController],
  providers: [CustomerCategoriesService],
})
export class CustomerCategoriesModule {}
