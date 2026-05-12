import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
