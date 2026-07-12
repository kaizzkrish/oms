import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { Session } from '../../../generated/prisma/client';

export interface CreateSessionData {
  userId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSessionData): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  findById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  findActiveByUser(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  rotate(
    id: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: { refreshTokenHash, expiresAt },
    });
  }

  revoke(id: string): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  revokeAllForUser(
    userId: string,
    exceptSessionId?: string,
  ): Promise<{ count: number }> {
    return this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }
}
