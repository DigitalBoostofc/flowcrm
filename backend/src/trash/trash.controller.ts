import { Controller, Get, Post, Delete, Param, UseGuards, HttpCode, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TrashService, TRASH_TYPES, TrashType } from './trash.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('trash')
@ApiBearerAuth('jwt')
@Controller('trash')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class TrashController {
  constructor(
    private readonly trash: TrashService,
    private readonly config: ConfigService,
  ) {}

  private get retentionDays(): number {
    return this.config.get<number>('TRASH_RETENTION_DAYS', 30);
  }

  private parseType(type: string): TrashType {
    if (!(TRASH_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestException(`Tipo de lixeira inválido: ${type}`);
    }
    return type as TrashType;
  }

  @Get()
  async listAll() {
    return {
      retentionDays: this.retentionDays,
      items: await this.trash.listAll(this.retentionDays),
    };
  }

  @Get(':type')
  async list(@Param('type') type: string) {
    return {
      retentionDays: this.retentionDays,
      items: await this.trash.list(this.parseType(type), this.retentionDays),
    };
  }

  @Post(':type/:id/restore')
  @HttpCode(204)
  async restore(@Param('type') type: string, @Param('id') id: string) {
    await this.trash.restore(this.parseType(type), id);
  }

  @Delete(':type/:id')
  @HttpCode(204)
  async purge(@Param('type') type: string, @Param('id') id: string) {
    await this.trash.purgeOne(this.parseType(type), id);
  }
}
