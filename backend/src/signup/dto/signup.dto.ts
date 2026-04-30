import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class SignupStartDto {
  @ApiProperty({ example: 'Maria Silva', minLength: 2, maxLength: 120 })
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiProperty({ example: 'maria@empresa.com.br' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '5511987654321',
    description: 'Telefone com DDI+DDD, apenas dígitos (10-15 caracteres)',
    pattern: '^\\d{10,15}$',
  })
  @IsString()
  @Matches(/^\d{10,15}$/, { message: 'Telefone deve ter apenas dígitos (10-15)' })
  phone: string;

  @ApiProperty({ example: 'senhaSegura123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Empresa Teste', minLength: 2, maxLength: 120, description: 'Nome do workspace que será criado' })
  @IsString()
  @Length(2, 120)
  workspaceName: string;
}

export class SignupVerifyDto {
  @ApiProperty({ description: 'ID do OTP retornado em /signup/start', example: 'b3a1d4f0-1234-5678-9abc-def012345678' })
  @IsString()
  otpId: string;

  @ApiProperty({ description: 'Código OTP recebido por SMS/WhatsApp', example: '482913', minLength: 4, maxLength: 8 })
  @IsString()
  @Length(4, 8)
  code: string;
}

export class SignupResendDto {
  @ApiProperty({ description: 'ID do OTP retornado em /signup/start', example: 'b3a1d4f0-1234-5678-9abc-def012345678' })
  @IsString()
  otpId: string;
}
