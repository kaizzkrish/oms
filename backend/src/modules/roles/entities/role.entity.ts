import { ApiProperty } from '@nestjs/swagger';
import type { Role } from '../../../generated/prisma/client';

export type RoleWithUserCount = Role & { _count: { userRoles: number } };

export class RoleEntity {
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

  @ApiProperty()
  userCount: number;

  @ApiProperty()
  createdAt: Date;

  constructor(props: RoleEntity) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.isSystem = props.isSystem;
    this.isActive = props.isActive;
    this.userCount = props.userCount;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(role: RoleWithUserCount): RoleEntity {
    return new RoleEntity({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
      userCount: role._count.userRoles,
      createdAt: role.createdAt,
    });
  }
}
