import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboxTag } from './entities/inbox-tag.entity';
import { InboxTagsService } from './inbox-tags.service';
import { InboxTagsController } from './inbox-tags.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InboxTag])],
  controllers: [InboxTagsController],
  providers: [InboxTagsService],
  exports: [InboxTagsService],
})
export class InboxTagsModule {}
