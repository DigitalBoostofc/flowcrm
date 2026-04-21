import { Body, Controller, Delete, Get, Param, Put, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserPreferencesService } from './user-preferences.service';

const KEY_REGEX = /^[a-zA-Z0-9._:-]{1,120}$/;

@Controller('me/preferences')
@UseGuards(JwtAuthGuard)
export class UserPreferencesController {
  constructor(private service: UserPreferencesService) {}

  @Get()
  getAll(@CurrentUser() user: { id: string }) {
    return this.service.getAll(user.id);
  }

  @Put(':key')
  async set(
    @CurrentUser() user: { id: string },
    @Param('key') key: string,
    @Body() body: { value: unknown },
  ) {
    if (!KEY_REGEX.test(key)) throw new BadRequestException('Chave inválida.');
    if (body === undefined || !('value' in (body ?? {}))) {
      throw new BadRequestException('Campo "value" é obrigatório.');
    }
    await this.service.set(user.id, key, body.value);
    return { ok: true };
  }

  @Delete(':key')
  async remove(@CurrentUser() user: { id: string }, @Param('key') key: string) {
    if (!KEY_REGEX.test(key)) throw new BadRequestException('Chave inválida.');
    await this.service.remove(user.id, key);
    return { ok: true };
  }
}
