import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserIntegration } from './entities/user-integration.entity';
import { GoogleCalendarService } from './google-calendar.service';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserIntegration])],
  controllers: [IntegrationsController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class IntegrationsModule {}
