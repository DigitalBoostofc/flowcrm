import { Body, Controller, Post } from '@nestjs/common';
import { SignupService } from './signup.service';
import { SignupResendDto, SignupStartDto, SignupVerifyDto } from './dto/signup.dto';

@Controller('signup')
export class SignupController {
  constructor(private service: SignupService) {}

  @Post('start')
  start(@Body() dto: SignupStartDto) {
    return this.service.start(dto);
  }

  @Post('verify')
  verify(@Body() dto: SignupVerifyDto) {
    return this.service.verify(dto.otpId, dto.code);
  }

  @Post('resend')
  resend(@Body() dto: SignupResendDto) {
    return this.service.resend(dto.otpId);
  }
}
