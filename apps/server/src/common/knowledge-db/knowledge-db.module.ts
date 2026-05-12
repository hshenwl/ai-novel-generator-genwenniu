import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { PrismaDatabaseProvider } from './prisma-database-provider';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [PrismaDatabaseProvider],
  exports: [PrismaDatabaseProvider],
})
export class KnowledgeDbModule {}
