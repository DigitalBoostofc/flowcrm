import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AudioTranscriptionService } from './audio-transcription.service';
import { SendMessageDto, SendMediaDto, ReactMessageDto, DeleteMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChannelsService } from '../channels/channels.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';

class TranscribeDto {
  @IsString()
  audioUrl: string;
}

@ApiTags('messages')
@ApiBearerAuth('jwt')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    private channelsService: ChannelsService,
    private conversationsService: ConversationsService,
    private audioTranscriptionService: AudioTranscriptionService,
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

  @Post('send-media')
  async sendMedia(@Body() dto: SendMediaDto) {
    const conv = await this.conversationsService.findOne(dto.conversationId);
    const result = await this.channelsService.send({
      channelConfigId: dto.channelConfigId,
      to: conv.externalId ?? '',
      body: dto.mediaCaption ?? '',
      mediaType: dto.mediaType,
      mediaUrl: dto.mediaUrl,
      base64: dto.base64,
      mediaMimeType: dto.mediaMimeType,
      mediaCaption: dto.mediaCaption,
      mediaFileName: dto.mediaFileName,
    });
    return this.messagesService.saveOutbound({
      conversationId: dto.conversationId,
      body: dto.mediaCaption ?? '',
      externalMessageId: result.externalMessageId,
      status: result.status,
      type: dto.mediaType,
      mediaUrl: dto.mediaUrl,
      mediaMimeType: dto.mediaMimeType,
      mediaCaption: dto.mediaCaption,
      mediaFileName: dto.mediaFileName,
    });
  }

  @Post('react')
  async react(@Body() dto: ReactMessageDto) {
    await this.channelsService.reactToMessage(dto.channelConfigId, dto.messageId, dto.emoji);
    return { ok: true };
  }

  @Post('transcribe')
  async transcribe(@Body() dto: TranscribeDto) {
    const transcript = await this.audioTranscriptionService.transcribe(dto.audioUrl);
    return { transcript };
  }

  @Delete(':id')
  async deleteMessage(@Param('id') id: string, @Body() dto: DeleteMessageDto) {
    await this.channelsService.deleteMessage(dto.channelConfigId, dto.messageId);
    await this.messagesService.softDelete(id);
    return { ok: true };
  }
}
