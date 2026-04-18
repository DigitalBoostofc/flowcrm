import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  create(@Body() dto: CreateChannelDto) {
    return this.channelsService.create(dto);
  }

  @Get()
  findAll() {
    return this.channelsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.channelsService.findById(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string) {
    return this.channelsService.remove(id);
  }
}
