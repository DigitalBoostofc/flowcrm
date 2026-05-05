import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { AudioTranscriptionService } from './audio-transcription.service';
import { Message } from './entities/message.entity';
import { ChannelsModule } from '../channels/channels.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    forwardRef(() => ChannelsModule),
    ConversationsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, AudioTranscriptionService],
  exports: [MessagesService],
})
export class MessagesModule {}
