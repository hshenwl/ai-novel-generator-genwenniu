export class CreateCareerDto {
  projectId!: string;
  name!: string;
  type?: string;
  description?: string;
  levels?: string;
  promotion?: string;
}

export class UpdateCareerDto {
  name?: string;
  type?: string;
  description?: string;
  levels?: string;
  promotion?: string;
}
