import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpVerification } from './entities/otp-verification.entity';
import { User } from '../users/entities/user.entity';
import { SignupService } from './signup.service';
import { SignupController } from './signup.controller';
import { AuthModule } from '../auth/auth.module';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [TypeOrmModule.forFeature([OtpVerification, User]), AuthModule, ChannelsModule],
  controllers: [SignupController],
  providers: [SignupService],
})
export class SignupModule {}
