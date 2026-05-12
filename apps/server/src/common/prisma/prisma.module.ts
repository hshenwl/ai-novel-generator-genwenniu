import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { OwnershipService } from '../auth/ownership.service';

@Global()
@Module({
  providers: [PrismaService, OwnershipService],
  exports: [PrismaService, OwnershipService],
})
export class PrismaModule {}
