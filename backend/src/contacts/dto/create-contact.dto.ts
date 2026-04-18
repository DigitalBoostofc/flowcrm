import { IsNotEmpty, IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateContactDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  channelOrigin?: string;
}
