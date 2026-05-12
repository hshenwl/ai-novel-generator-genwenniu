import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma';
import { AuthModule } from '../auth/auth.module';
import { CharacterRelationshipController } from './character-relationship.controller';
import { CharacterRelationshipService } from './character-relationship.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CharacterRelationshipController],
  providers: [CharacterRelationshipService],
  exports: [CharacterRelationshipService],
})
export class CharacterRelationshipModule {}
