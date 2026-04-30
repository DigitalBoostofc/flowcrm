import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../common/platform-admin.guard';
import { AppSettingsService } from './app-settings.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

class UpdateAppSettingsDto {
  @IsOptional()
  @IsUUID()
  systemChannelConfigId?: string | null;

  @IsOptional()
  @IsBoolean()
  signupEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  trialDays?: number;
}

@ApiTags('app-settings')
@ApiBearerAuth('jwt')
@Controller('app-settings')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AppSettingsController {
  constructor(private service: AppSettingsService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @Put()
  update(@Body() dto: UpdateAppSettingsDto) {
    return this.service.update(dto);
  }
}
