import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma';
import { AuthModule } from '../auth/auth.module';
import { AuditReportController } from './audit-report.controller';
import { AuditReportService } from './audit-report.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AuditReportController],
  providers: [AuditReportService],
  exports: [AuditReportService],
})
export class AuditReportModule {}
