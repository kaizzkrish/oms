import { ApiProperty } from '@nestjs/swagger';
import type { PermissionGroup } from '../../../generated/prisma/client';

export type PermissionGroupWithCount = PermissionGroup & {
  _count: { permissions: number };
};

export class PermissionGroupEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  permissionCount: number;

  @ApiProperty()
  createdAt: Date;

  constructor(props: PermissionGroupEntity) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.isActive = props.isActive;
    this.permissionCount = props.permissionCount;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(group: PermissionGroupWithCount): PermissionGroupEntity {
    return new PermissionGroupEntity({
      id: group.id,
      name: group.name,
      description: group.description,
      isActive: group.isActive,
      permissionCount: group._count.permissions,
      createdAt: group.createdAt,
    });
  }
}
