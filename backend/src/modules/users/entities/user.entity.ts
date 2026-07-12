import { ApiProperty } from '@nestjs/swagger';
import type { User } from '../../../generated/prisma/client';

export class UserEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  constructor(props: UserEntity) {
    this.id = props.id;
    this.email = props.email;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.isActive = props.isActive;
    this.lastLoginAt = props.lastLoginAt;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(user: User): UserEntity {
    return new UserEntity({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    });
  }
}
