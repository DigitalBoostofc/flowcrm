import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditPruneScheduler } from './audit-prune.scheduler';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [
    AuditService,
    AuditPruneScheduler,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
