import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { BillingService } from './billing.service';
import { ApiTags } from '@nestjs/swagger';

class CheckoutDto {
  @IsString()
  planSlug: string;
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me() {
    return this.service.getMyBilling();
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  checkout(@Body() dto: CheckoutDto) {
    return this.service.createCheckoutSession(dto.planSlug);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  portal() {
    return this.service.createPortalSession();
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: true }> {
    if (!signature) throw new BadRequestException('Assinatura ausente');
    const rawBody: Buffer | undefined = req.rawBody;
    if (!rawBody) throw new BadRequestException('Corpo bruto ausente — rawBody não habilitado');
    await this.service.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
