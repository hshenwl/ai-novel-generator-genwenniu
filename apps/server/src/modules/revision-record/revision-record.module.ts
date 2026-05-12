import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma';
import { AuthModule } from '../auth/auth.module';
import { RevisionRecordController } from './revision-record.controller';
import { RevisionRecordService } from './revision-record.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RevisionRecordController],
  providers: [RevisionRecordService],
  exports: [RevisionRecordService],
})
export class RevisionRecordModule {}
