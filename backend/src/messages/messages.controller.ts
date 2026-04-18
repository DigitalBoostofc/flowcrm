import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChannelsService } from '../channels/channels.service';
import { ConversationsService } from '../conversations/conversations.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    private channelsService: ChannelsService,
    private conversationsService: ConversationsService,
  ) {}

  @Get()
  findByConversation(@Query('conversationId') conversationId: string) {
    return this.messagesService.findByConversation(conversationId);
  }

  @Post('send')
  async send(@Body() dto: SendMessageDto) {
    const conv = await this.conversationsService.findOne(dto.conversationId);
    const result = await this.channelsService.send({
      channelConfigId: dto.channelConfigId,
      to: conv.externalId ?? '',
      body: dto.body,
    });
    return this.messagesService.saveOutbound({
      conversationId: dto.conversationId,
      body: dto.body,
      externalMessageId: result.externalMessageId,
      status: result.status,
    });
  }
}
