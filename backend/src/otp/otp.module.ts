import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OtpService } from './otp.service';
import { PlatformChannelService } from './platform-channel.service';
import { User } from '../users/entities/user.entity';
import { ChannelConfig } from '../channels/entities/channel-config.entity';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ChannelConfig]),
    ChannelsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '5m' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [OtpService, PlatformChannelService],
  exports: [OtpService, PlatformChannelService],
})
export class OtpModule {}
