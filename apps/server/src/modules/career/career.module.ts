import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma';
import { AuthModule } from '../auth/auth.module';
import { CareerController } from './career.controller';
import { CareerService } from './career.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CareerController],
  providers: [CareerService],
  exports: [CareerService],
})
export class CareerModule {}
