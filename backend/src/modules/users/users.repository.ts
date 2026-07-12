import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { User } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { UserSortField } from './dto/query-users.dto';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyUsersOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  sortBy: UserSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: data.isActive,
        createdBy: data.createdBy,
      },
    });
  }

  update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        email: data.email?.toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: data.isActive,
        updatedBy: data.updatedBy,
      },
    });
  }

  updatePasswordHash(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  updateLastLoginAt(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  softDelete(id: string, deletedBy?: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  restore(id: string, updatedBy?: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: true,
        deletedAt: null,
        deletedBy: null,
        updatedBy,
      },
    });
  }

  private buildWhere(
    options: Pick<FindManyUsersOptions, 'search' | 'isActive'>,
  ): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};
    if (options.isActive === false) {
      // Explicitly browsing inactive users: also surface soft-deleted ones,
      // otherwise a deleted user could never be found again to be restored.
      where.isActive = false;
    } else {
      where.deletedAt = null;
      if (options.isActive === true) {
        where.isActive = true;
      }
    }
    if (options.search) {
      where.OR = [
        { email: { contains: options.search, mode: 'insensitive' } },
        { firstName: { contains: options.search, mode: 'insensitive' } },
        { lastName: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findMany(options: FindManyUsersOptions): Promise<[User[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);
    return [items, total];
  }
}
