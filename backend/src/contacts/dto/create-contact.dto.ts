import {
  IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsEmail, IsUUID,
  MaxLength, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContactPrivacy } from '../entities/contact.entity';

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

  @IsOptional()
  @IsString()
  @MaxLength(150)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  categoria?: string;

  @IsOptional()
  @IsUUID()
  responsibleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  birthDay?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  birthYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  origem?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  celular?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  fax?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ramal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  pais?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  estado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cidade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bairro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  rua?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  numero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  complemento?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  produtos?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  twitter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  linkedin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  skype?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  instagram?: string;

  @IsOptional()
  @IsEnum(ContactPrivacy)
  privacy?: ContactPrivacy;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  additionalAccessUserIds?: string[];
}
