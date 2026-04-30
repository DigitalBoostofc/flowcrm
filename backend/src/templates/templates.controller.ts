import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureGuard } from '../common/feature-access/feature.guard';
import { RequireFeature } from '../common/feature-access/require-feature.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('templates')
@ApiBearerAuth('jwt')
@Controller('templates')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('automation_templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Post()
  create(@Body() dto: CreateTemplateDto, @Request() req: { user: { id: string } }) {
    return this.templatesService.create(dto, req.user.id);
  }

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }
}
