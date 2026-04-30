import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SectorsService } from './sectors.service';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('sectors')
@ApiBearerAuth('jwt')
@Controller('sectors')
@UseGuards(JwtAuthGuard)
export class SectorsController {
  constructor(private service: SectorsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  create(@Body() dto: CreateSectorDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateSectorDto) {
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
