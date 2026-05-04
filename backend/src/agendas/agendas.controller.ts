import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgendasService } from './agendas.service';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';

@ApiTags('agendas')
@ApiBearerAuth('jwt')
@Controller('agendas')
@UseGuards(JwtAuthGuard)
export class AgendasController {
  constructor(private readonly service: AgendasService) {}

  // ── Agendas ──────────────────────────────────────────────────────────────

  @Post()
  create(@Body() dto: CreateAgendaDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('active') active?: string) {
    return this.service.findAll(active === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAgendaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  // ── Slots ─────────────────────────────────────────────────────────────────

  @Get(':id/slots')
  getSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date: string,
  ) {
    return this.service.getAvailableSlots(id, date);
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  @Post(':id/appointments')
  createAppointment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAppointmentDto,
    @Req() req: any,
  ) {
    return this.service.createAppointment(id, dto, req.user?.sub);
  }

  @Get(':id/appointments')
  listAppointments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryAppointmentsDto,
  ) {
    return this.service.listAppointments(id, query);
  }

  @Patch(':id/appointments/:apptId')
  updateAppointment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('apptId', ParseUUIDPipe) apptId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.service.updateAppointment(id, apptId, dto);
  }

  @Delete(':id/appointments/:apptId')
  @HttpCode(204)
  cancelAppointment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('apptId', ParseUUIDPipe) apptId: string,
  ) {
    return this.service.cancelAppointment(id, apptId);
  }
}
