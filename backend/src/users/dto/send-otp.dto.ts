import { IsIn, IsString } from 'class-validator';

export class SendProfileOtpDto {
  @IsIn(['email_change', 'password_change'])
  purpose: 'email_change' | 'password_change';
}

export class VerifyProfileOtpDto {
  @IsIn(['email_change', 'password_change'])
  purpose: 'email_change' | 'password_change';

  @IsString()
  code: string;
}
