import { IsArray, IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CompanyPrivacy } from '../entities/company.entity';

export class UpdateCompanyDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(20) cnpj?: string;
  @IsOptional() @IsString() @MaxLength(200) razaoSocial?: string;
  @IsOptional() @IsString() categoria?: string;
  @IsOptional() @IsString() origem?: string;
  @IsOptional() @IsString() setor?: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsUUID() responsibleId?: string;

  @IsOptional() @IsEnum(CompanyPrivacy) privacy?: CompanyPrivacy;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) additionalAccessUserIds?: string[];

  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() celular?: string;
  @IsOptional() @IsString() fax?: string;
  @IsOptional() @IsString() ramal?: string;
  @IsOptional() @IsString() website?: string;

  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() pais?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() rua?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() complemento?: string;

  @IsOptional() @IsArray() produtos?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) pessoaIds?: string[];

  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() twitter?: string;
  @IsOptional() @IsString() linkedin?: string;
  @IsOptional() @IsString() skype?: string;
  @IsOptional() @IsString() instagram?: string;

  @IsOptional() @IsInt() ranking?: number;
}
