import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CustomerCategoriesService } from './customer-categories.service';
import { CreateCustomerCategoryDto } from './dto/create-customer-category.dto';
import { UpdateCustomerCategoryDto } from './dto/update-customer-category.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('customer-categories')
@ApiBearerAuth('jwt')
@Controller('customer-categories')
@UseGuards(JwtAuthGuard)
export class CustomerCategoriesController {
  constructor(private service: CustomerCategoriesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  create(@Body() dto: CreateCustomerCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateCustomerCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @HttpCode(204)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }
}
