import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkingHours } from '../entities/agenda.entity';

class TimeBlockDto {
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  start: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  end: string;
}

export class CreateAgendaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ownerName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @IsOptional()
  @IsObject()
  workingHours?: WorkingHours;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
