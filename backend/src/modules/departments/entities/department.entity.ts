import { ApiProperty } from '@nestjs/swagger';
import type { Department } from '../../../generated/prisma/client';

export class DepartmentEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ nullable: true })
  officeId: string | null;

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

  constructor(props: DepartmentEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.officeId = props.officeId;
    this.name = props.name;
    this.code = props.code;
    this.description = props.description;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(department: Department): DepartmentEntity {
    return new DepartmentEntity({
      id: department.id,
      organizationId: department.organizationId,
      officeId: department.officeId,
      name: department.name,
      code: department.code,
      description: department.description,
      isActive: department.isActive,
      createdAt: department.createdAt,
    });
  }
}
