import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ArrayUnique, IsArray, IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Max, Min,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PlatformAdminGuard } from '../common/platform-admin.guard';
import { SubscriptionsService } from './subscriptions.service';

class SubscribeDto {
  @IsString()
  planId: string;
}

class CreatePlanDto {
  @IsString() @Length(1, 40) @Matches(/^[a-z0-9_-]+$/, { message: 'slug deve ser minúsculas, números, _ ou -' })
  slug: string;

  @IsString() @Length(1, 80) name: string;

  @IsOptional() @IsString() @Length(0, 2000) description?: string;

  @IsInt() @Min(0) @Max(100_000_00) priceMonthlyCents: number;

  @IsArray() @ArrayUnique() @IsString({ each: true })
  features: string[];

  @IsOptional() @IsBoolean() highlight?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

class UpdatePlanDto {
  @IsOptional() @IsString() @Length(1, 40) @Matches(/^[a-z0-9_-]+$/) slug?: string;
  @IsOptional() @IsString() @Length(1, 80) name?: string;
  @IsOptional() @IsString() @Length(0, 2000) description?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100_000_00) priceMonthlyCents?: number;
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsBoolean() highlight?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private service: SubscriptionsService) {}

  @Get('plans')
  listPlans() {
    return this.service.listPlans();
  }

  @Get('features/catalog')
  getFeatureCatalog() {
    return this.service.getFeatureCatalog();
  }

  @Get('me/features')
  getMyFeatures() {
    return this.service.getMyFeatures();
  }

  @Post('subscribe')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  subscribe(@Body() dto: SubscribeDto) {
    return this.service.subscribe(dto.planId);
  }

  @Post('cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  cancel() {
    return this.service.cancel();
  }
}

@Controller('platform/plans')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformPlansController {
  constructor(private service: SubscriptionsService) {}

  @Get()
  list() {
    return this.service.adminListPlans();
  }

  @Get('catalog')
  catalog() {
    return this.service.getFeatureCatalog();
  }

  @Post()
  create(@Body() dto: CreatePlanDto) {
    return this.service.adminCreatePlan(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto) {
    return this.service.adminUpdatePlan(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.adminDeletePlan(id);
    return { ok: true };
  }
}
