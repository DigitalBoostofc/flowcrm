import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { ChannelConfig } from './entities/channel-config.entity';
import { EvolutionAdapter } from './evolution/evolution.adapter';
import { EvolutionWebhookController } from './evolution/evolution-webhook.controller';
import { MetaAdapter } from './meta/meta.adapter';
import { MetaWebhookController } from './meta/meta-webhook.controller';
import { MetaSignatureGuard } from './meta/meta-signature.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ChannelConfig])],
  controllers: [ChannelsController, EvolutionWebhookController, MetaWebhookController],
  providers: [ChannelsService, EvolutionAdapter, MetaAdapter, MetaSignatureGuard],
  exports: [ChannelsService],
})
export class ChannelsModule {}
