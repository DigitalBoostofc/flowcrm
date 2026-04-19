import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SubscriptionsService } from './subscriptions.service';

class SubscribeDto {
  @IsString()
  planId: string;
}

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private service: SubscriptionsService) {}

  @Get('plans')
  listPlans() {
    return this.service.listPlans();
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
