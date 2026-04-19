import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AppSettingsService } from './app-settings.service';

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

@Controller('app-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
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
