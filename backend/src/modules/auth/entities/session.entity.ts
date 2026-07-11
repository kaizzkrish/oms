import { ApiProperty } from '@nestjs/swagger';
import type { Session } from '../../../generated/prisma/client';

export class SessionEntity {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  userAgent: string | null;

  @ApiProperty({ nullable: true })
  ipAddress: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  isCurrent: boolean;

  constructor(props: SessionEntity) {
    this.id = props.id;
    this.userAgent = props.userAgent;
    this.ipAddress = props.ipAddress;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
    this.isCurrent = props.isCurrent;
  }

  static fromPrisma(
    session: Session,
    currentSessionId?: string,
  ): SessionEntity {
    return new SessionEntity({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: session.id === currentSessionId,
    });
  }
}
