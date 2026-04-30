import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpVerification } from './entities/otp-verification.entity';
import { User } from '../users/entities/user.entity';
import { SignupService } from './signup.service';
import { SignupController } from './signup.controller';
import { AuthModule } from '../auth/auth.module';
import { ChannelsModule } from '../channels/channels.module';
import { OtpModule } from '../otp/otp.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadsModule } from '../leads/leads.module';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { OutboundModule } from '../messaging/outbound/outbound.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpVerification, User]),
    AuthModule,
    ChannelsModule,
    OtpModule,
    ContactsModule,
    LeadsModule,
    PipelinesModule,
    OutboundModule,
  ],
  controllers: [SignupController],
  providers: [SignupService],
})
export class SignupModule {}
