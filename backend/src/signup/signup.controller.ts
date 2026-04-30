import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SignupService } from './signup.service';
import { SignupResendDto, SignupStartDto, SignupVerifyDto } from './dto/signup.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('signup')
@Controller('signup')
export class SignupController {
  constructor(private service: SignupService) {}

  @Post('start')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  start(@Body() dto: SignupStartDto) {
    return this.service.start(dto);
  }

  @Post('verify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verify(@Body() dto: SignupVerifyDto) {
    return this.service.verify(dto.otpId, dto.code);
  }

  @Post('resend')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resend(@Body() dto: SignupResendDto) {
    return this.service.resend(dto.otpId);
  }
}
