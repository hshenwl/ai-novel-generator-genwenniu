export class CreateCharacterRelationshipDto {
  projectId!: string;
  sourceId!: string;
  targetId!: string;
  relationType!: string;
  description?: string;
  isHidden?: boolean;
  firstChapter?: number;
  lastChapter?: number;
}

export class UpdateCharacterRelationshipDto {
  sourceId?: string;
  targetId?: string;
  relationType?: string;
  description?: string;
  isHidden?: boolean;
  firstChapter?: number;
  lastChapter?: number;
  status?: string;
}
