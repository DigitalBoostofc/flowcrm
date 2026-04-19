import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContactsModule } from './contacts/contacts.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { StagesModule } from './stages/stages.module';
import { LeadsModule } from './leads/leads.module';
import { TemplatesModule } from './templates/templates.module';
import { ChannelsModule } from './channels/channels.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { AutomationsModule } from './automations/automations.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { QueuesModule } from './common/queues/queues.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LeadActivitiesModule } from './lead-activities/lead-activities.module';
import { LossReasonsModule } from './loss-reasons/loss-reasons.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SearchModule } from './search/search.module';
import { TasksModule } from './tasks/tasks.module';
import { CompaniesModule } from './companies/companies.module';
import { CustomerOriginsModule } from './customer-origins/customer-origins.module';
import { CustomerCategoriesModule } from './customer-categories/customer-categories.module';
import { SectorsModule } from './sectors/sectors.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    QueuesModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: config.get('NODE_ENV') === 'production',
        logging: config.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ContactsModule,
    PipelinesModule,
    StagesModule,
    LeadsModule,
    TemplatesModule,
    ChannelsModule,
    ConversationsModule,
    MessagesModule,
    AutomationsModule,
    SchedulerModule,
    NotificationsModule,
    LeadActivitiesModule,
    LossReasonsModule,
    AnalyticsModule,
    SearchModule,
    TasksModule,
    CompaniesModule,
    CustomerOriginsModule,
    CustomerCategoriesModule,
    SectorsModule,
  ],
})
export class AppModule {}
