import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../common/platform-admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PlatformAdminService } from './platform-admin.service';
import type { SubscriptionStatus } from '../workspaces/entities/workspace.entity';
import type { BroadcastSeverity } from './entities/platform-broadcast.entity';

class UpdateWorkspaceDto {
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @IsIn(['trial', 'active', 'expired', 'canceled']) subscriptionStatus?: SubscriptionStatus;
  @IsOptional() @IsDateString() trialEndsAt?: string;
  @IsOptional() @IsString() @Length(0, 40) planSlug?: string | null;
}

class BroadcastDto {
  @IsString() @Length(1, 120) title: string;
  @IsString() @Length(1, 4000) body: string;
  @IsOptional() @IsIn(['info', 'warning', 'critical']) severity?: BroadcastSeverity;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

class UpdateBroadcastDto {
  @IsOptional() @IsString() @Length(1, 120) title?: string;
  @IsOptional() @IsString() @Length(1, 4000) body?: string;
  @IsOptional() @IsIn(['info', 'warning', 'critical']) severity?: BroadcastSeverity;
  @IsOptional() @IsDateString() startsAt?: string | null;
  @IsOptional() @IsDateString() endsAt?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}

class UpsertFlagDto {
  @IsString() @Length(1, 80) key: string;
  @IsOptional() @IsUUID() workspaceId?: string | null;
  @IsBoolean() enabled: boolean;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

class AuditQueryDto {
  @IsOptional() @IsInt() @Min(1) @Max(500) limit?: number;
  @IsOptional() @IsInt() @Min(0) offset?: number;
}

@Controller('platform')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformAdminController {
  constructor(private svc: PlatformAdminService) {}

  // Workspaces
  @Get('workspaces')
  listWorkspaces(@Query('search') search?: string) {
    return this.svc.listWorkspaces(search);
  }

  @Get('workspaces/:id')
  getWorkspace(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getWorkspace(id);
  }

  @Patch('workspaces/:id')
  updateWorkspace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.svc.updateWorkspace(id, dto, { email: user.email, userId: user.id });
  }

  @Post('workspaces/:id/impersonate')
  impersonate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.svc.impersonate(id, { email: user.email, userId: user.id });
  }

  // Channels (cross-workspace)
  @Get('channels')
  listChannels() {
    return this.svc.listChannels();
  }

  // Signups
  @Get('signups')
  listSignups(@Query('days') days?: string) {
    return this.svc.listSignups(days ? Math.max(1, parseInt(days, 10)) : 30);
  }

  @Get('signups/funnel')
  signupFunnel(@Query('days') days?: string) {
    return this.svc.signupFunnel(days ? Math.max(1, parseInt(days, 10)) : 30);
  }

  // Metrics
  @Get('metrics')
  metrics() {
    return this.svc.metrics();
  }

  // Broadcasts
  @Get('broadcasts')
  listBroadcasts() {
    return this.svc.listBroadcasts();
  }

  @Post('broadcasts')
  createBroadcast(@Body() dto: BroadcastDto, @CurrentUser() user: { id: string; email: string }) {
    return this.svc.createBroadcast(dto, { email: user.email, userId: user.id });
  }

  @Patch('broadcasts/:id')
  updateBroadcast(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBroadcastDto,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.svc.updateBroadcast(id, dto, { email: user.email, userId: user.id });
  }

  @Delete('broadcasts/:id')
  async deleteBroadcast(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string },
  ) {
    await this.svc.deleteBroadcast(id, { email: user.email, userId: user.id });
    return { ok: true };
  }

  // Feature flags
  @Get('flags')
  listFlags() {
    return this.svc.listFlags();
  }

  @Post('flags')
  upsertFlag(@Body() dto: UpsertFlagDto, @CurrentUser() user: { id: string; email: string }) {
    return this.svc.upsertFlag(dto, { email: user.email, userId: user.id });
  }

  @Delete('flags/:id')
  async deleteFlag(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string },
  ) {
    await this.svc.deleteFlag(id, { email: user.email, userId: user.id });
    return { ok: true };
  }

  // Audit
  @Get('audit')
  listAudit(@Query() q: AuditQueryDto) {
    return this.svc.listAudit(q.limit ?? 100, q.offset ?? 0);
  }
}
