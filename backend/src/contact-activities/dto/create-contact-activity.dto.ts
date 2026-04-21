import { IsEnum, IsString, IsOptional, IsISO8601 } from 'class-validator';
import { ContactActivityType } from '../entities/contact-activity.entity';

export class CreateContactActivityDto {
  @IsEnum(ContactActivityType)
  type: ContactActivityType;

  @IsString()
  body: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}
