import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'usuario@exemplo.com', description: 'Email do usuário cadastrado' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senhaSegura123', minLength: 6, description: 'Senha do usuário' })
  @IsString()
  @MinLength(6)
  password: string;
}
