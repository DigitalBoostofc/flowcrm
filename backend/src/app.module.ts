import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClsModule } from 'nestjs-cls';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TenantModule } from './common/tenant/tenant.module';
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
import { ContactActivitiesModule } from './contact-activities/contact-activities.module';
import { LossReasonsModule } from './loss-reasons/loss-reasons.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SearchModule } from './search/search.module';
import { TasksModule } from './tasks/tasks.module';
import { CompaniesModule } from './companies/companies.module';
import { CustomerOriginsModule } from './customer-origins/customer-origins.module';
import { CustomerCategoriesModule } from './customer-categories/customer-categories.module';
import { SectorsModule } from './sectors/sectors.module';
import { StageRequiredFieldsModule } from './stage-required-fields/stage-required-fields.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { LabelsModule } from './labels/labels.module';
import { AppSettingsModule } from './app-settings/app-settings.module';
import { SignupModule } from './signup/signup.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SubscriptionModule } from './common/subscription/subscription.module';
import { FeatureAccessModule } from './common/feature-access/feature-access.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';
import { StorageModule } from './storage/storage.module';
import { OtpModule } from './otp/otp.module';
import { ProductsModule } from './products/products.module';
import { BillingModule } from './billing/billing.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MailModule } from './mail/mail.module';
import { SummaryModule } from './summary/summary.module';
import { CaptureModule } from './capture/capture.module';
import { HealthModule } from './common/health/health.module';
import { PinoLoggerModule } from './common/logging/logger.config';
import { envSchema } from './common/config/env.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
    PinoLoggerModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'default', ttl: 60_000, limit: 120 },
      { name: 'long', ttl: 3_600_000, limit: 2000 },
    ]),
    EventEmitterModule.forRoot(),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    TenantModule,
    QueuesModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: config.get<string>('RUN_MIGRATIONS_ON_BOOT', 'true') === 'true',
        logging: config.get('NODE_ENV') !== 'production',
        extra: {
          max: parseInt(config.get<string>('DB_POOL_MAX', '30'), 10),
          min: parseInt(config.get<string>('DB_POOL_MIN', '5'), 10),
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 10_000,
          statement_timeout: 30_000,
          application_name: 'flowcrm-backend',
        },
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
    ContactActivitiesModule,
    LossReasonsModule,
    AnalyticsModule,
    SearchModule,
    TasksModule,
    CompaniesModule,
    CustomerOriginsModule,
    CustomerCategoriesModule,
    SectorsModule,
    StageRequiredFieldsModule,
    WorkspacesModule,
    IntegrationsModule,
    LabelsModule,
    AppSettingsModule,
    SignupModule,
    SubscriptionsModule,
    SubscriptionModule,
    FeatureAccessModule,
    PlatformAdminModule,
    StorageModule,
    OtpModule,
    ProductsModule,
    BillingModule,
    MailModule,
    SummaryModule,
    CaptureModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
