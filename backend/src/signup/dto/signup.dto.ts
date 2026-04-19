import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class SignupStartDto {
  @IsString()
  @Length(2, 120)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\d{10,15}$/, { message: 'Telefone deve ter apenas dígitos (10-15)' })
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @Length(2, 120)
  workspaceName: string;
}

export class SignupVerifyDto {
  @IsString()
  otpId: string;

  @IsString()
  @Length(4, 8)
  code: string;
}

export class SignupResendDto {
  @IsString()
  otpId: string;
}
