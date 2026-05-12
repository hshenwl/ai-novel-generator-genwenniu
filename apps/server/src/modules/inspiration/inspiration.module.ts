import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma';
import { InspirationController } from './inspiration.controller';
import { InspirationService } from './inspiration.service';

@Module({
  imports: [PrismaModule],
  controllers: [InspirationController],
  providers: [InspirationService],
  exports: [InspirationService],
})
export class InspirationModule {}
