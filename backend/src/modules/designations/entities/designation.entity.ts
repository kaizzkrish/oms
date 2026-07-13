import { ApiProperty } from '@nestjs/swagger';
import type { Designation } from '../../../generated/prisma/client';

export class DesignationEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ nullable: true })
  departmentId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  code: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: DesignationEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.departmentId = props.departmentId;
    this.name = props.name;
    this.code = props.code;
    this.description = props.description;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(designation: Designation): DesignationEntity {
    return new DesignationEntity({
      id: designation.id,
      organizationId: designation.organizationId,
      departmentId: designation.departmentId,
      name: designation.name,
      code: designation.code,
      description: designation.description,
      isActive: designation.isActive,
      createdAt: designation.createdAt,
    });
  }
}
