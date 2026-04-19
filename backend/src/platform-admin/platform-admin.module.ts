import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { User } from '../users/entities/user.entity';
import { ChannelConfig } from '../channels/entities/channel-config.entity';
import { OtpVerification } from '../signup/entities/otp-verification.entity';
import { PlatformAuditLog } from './entities/platform-audit-log.entity';
import { PlatformBroadcast } from './entities/platform-broadcast.entity';
import { FeatureFlag } from './entities/feature-flag.entity';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformAdminController } from './platform-admin.controller';
import { BroadcastsPublicController } from './broadcasts-public.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      User,
      ChannelConfig,
      OtpVerification,
      PlatformAuditLog,
      PlatformBroadcast,
      FeatureFlag,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PlatformAdminController, BroadcastsPublicController],
  providers: [PlatformAdminService],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
