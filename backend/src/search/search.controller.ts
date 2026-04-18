import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private service: SearchService) {}

  @Get()
  search(@Query('q') q: string) {
    return this.service.search(q ?? '');
  }
}
