import { ApiProperty } from '@nestjs/swagger';
import type { Permission } from '../../../generated/prisma/client';

export class PermissionEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  isSystem: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ nullable: true })
  groupId: string | null;

  @ApiProperty()
  createdAt: Date;

  constructor(props: PermissionEntity) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.isSystem = props.isSystem;
    this.isActive = props.isActive;
    this.groupId = props.groupId;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(permission: Permission): PermissionEntity {
    return new PermissionEntity({
      id: permission.id,
      name: permission.name,
      description: permission.description,
      isSystem: permission.isSystem,
      isActive: permission.isActive,
      groupId: permission.groupId,
      createdAt: permission.createdAt,
    });
  }
}
