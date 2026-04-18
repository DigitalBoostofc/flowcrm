import { Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { LossReasonsService } from './loss-reasons.service';
import { CreateLossReasonDto } from './dto/create-loss-reason.dto';

@Controller('loss-reasons')
@UseGuards(JwtAuthGuard)
export class LossReasonsController {
  constructor(private service: LossReasonsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  create(@Body() dto: CreateLossReasonDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @HttpCode(204)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }
}
