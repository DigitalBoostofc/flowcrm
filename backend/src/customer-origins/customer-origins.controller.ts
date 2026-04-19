import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CustomerOriginsService } from './customer-origins.service';
import { CreateCustomerOriginDto } from './dto/create-customer-origin.dto';
import { UpdateCustomerOriginDto } from './dto/update-customer-origin.dto';

@Controller('customer-origins')
@UseGuards(JwtAuthGuard)
export class CustomerOriginsController {
  constructor(private service: CustomerOriginsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  create(@Body() dto: CreateCustomerOriginDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateCustomerOriginDto) {
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
