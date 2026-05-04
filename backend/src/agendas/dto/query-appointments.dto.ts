import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { AppointmentStatus } from '../entities/appointment.entity';

export class QueryAppointmentsDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;
}
