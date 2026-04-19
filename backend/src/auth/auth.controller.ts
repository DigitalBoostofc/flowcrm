import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { IsEmail, IsString, MinLength, Length } from 'class-validator';

class ForgotPasswordDto {
  @IsEmail() email: string;
}

class VerifyCodeDto {
  @IsEmail() email: string;
  @IsString() @Length(6, 6) code: string;
}

class ResetPasswordDto {
  @IsString() resetToken: string;
  @IsString() @MinLength(6) newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('verify-reset-code')
  verifyResetCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyResetCode(dto.email, dto.code);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.resetToken, dto.newPassword);
  }
}
