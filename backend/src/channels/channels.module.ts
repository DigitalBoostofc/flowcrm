import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { ChannelConfig } from './entities/channel-config.entity';
import { EvolutionAdapter } from './evolution/evolution.adapter';
import { EvolutionWebhookController } from './evolution/evolution-webhook.controller';
import { UazapiAdapter } from './uazapi/uazapi.adapter';
import { UazapiWebhookController } from './uazapi/uazapi-webhook.controller';
import { MetaAdapter } from './meta/meta.adapter';
import { MetaWebhookController } from './meta/meta-webhook.controller';
import { MetaSignatureGuard } from './meta/meta-signature.guard';
import { TelegramAdapter } from './telegram/telegram.adapter';
import { TelegramWebhookController } from './telegram/telegram-webhook.controller';
import { InboundListener } from './inbound.listener';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadsModule } from '../leads/leads.module';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChannelConfig]),
    ConversationsModule,
    forwardRef(() => MessagesModule),
  ],
  controllers: [ChannelsController, EvolutionWebhookController, UazapiWebhookController, MetaWebhookController, TelegramWebhookController],
  providers: [ChannelsService, EvolutionAdapter, UazapiAdapter, MetaAdapter, MetaSignatureGuard, TelegramAdapter, InboundListener],
  exports: [ChannelsService],
})
export class ChannelsModule {}
