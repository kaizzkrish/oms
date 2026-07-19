import { ApiProperty } from '@nestjs/swagger';
import type { Reference } from '../../../generated/prisma/client';
import type { ReferenceType } from '../constants/reference-type';

export class ReferenceEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  type: ReferenceType;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: ReferenceEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.projectId = props.projectId;
    this.name = props.name;
    this.url = props.url;
    this.description = props.description;
    this.type = props.type;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(reference: Reference): ReferenceEntity {
    return new ReferenceEntity({
      id: reference.id,
      organizationId: reference.organizationId,
      projectId: reference.projectId,
      name: reference.name,
      url: reference.url,
      description: reference.description,
      type: reference.type as ReferenceType,
      isActive: reference.isActive,
      createdAt: reference.createdAt,
    });
  }
}
