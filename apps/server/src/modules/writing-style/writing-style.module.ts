import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma';
import { AuthModule } from '../auth/auth.module';
import { WritingStyleController } from './writing-style.controller';
import { WritingStyleService } from './writing-style.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WritingStyleController],
  providers: [WritingStyleService],
  exports: [WritingStyleService],
})
export class WritingStyleModule {}
