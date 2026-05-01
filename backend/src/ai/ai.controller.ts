import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureGuard } from '../common/feature-access/feature.guard';
import { RequireFeature } from '../common/feature-access/require-feature.decorator';
import { ConversationSummaryService } from './services/conversation-summary.service';
import { SummaryResponseDto } from './dto/summary-response.dto';

@ApiTags('ai')
@ApiBearerAuth('jwt')
@Controller()
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('ai_assist')
export class AiController {
  constructor(private readonly summaryService: ConversationSummaryService) {}

  @Post('conversations/:id/ai/summary')
  @ApiOperation({ summary: 'Resume a conversa (até 5 linhas) com IA.' })
  @ApiResponse({ status: 200, type: SummaryResponseDto })
  summarize(@Param('id', new ParseUUIDPipe()) id: string): Promise<SummaryResponseDto> {
    return this.summaryService.summarize(id);
  }
}
