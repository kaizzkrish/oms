import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Office } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { OfficeSortField } from './dto/query-offices.dto';

export interface CreateOfficeData {
  organizationId: string;
  name: string;
  isHeadquarters?: boolean;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateOfficeData {
  organizationId?: string;
  name?: string;
  isHeadquarters?: boolean;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyOfficesOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  sortBy: OfficeSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class OfficesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Office | null> {
    return this.prisma.office.findUnique({ where: { id } });
  }

  create(data: CreateOfficeData): Promise<Office> {
    return this.prisma.office.create({ data });
  }

  update(id: string, data: UpdateOfficeData): Promise<Office> {
    return this.prisma.office.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy?: string): Promise<Office> {
    return this.prisma.office.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Office> {
    return this.prisma.office.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  /** Unsets isHeadquarters on every other office in the organization. */
  async unsetOtherHeadquarters(
    organizationId: string,
    exceptOfficeId: string,
  ): Promise<void> {
    await this.prisma.office.updateMany({
      where: {
        organizationId,
        id: { not: exceptOfficeId },
        isHeadquarters: true,
      },
      data: { isHeadquarters: false },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyOfficesOptions,
      'search' | 'isActive' | 'organizationId'
    >,
  ): Prisma.OfficeWhereInput {
    const where: Prisma.OfficeWhereInput = {};
    if (options.isActive === false) {
      where.isActive = false;
    } else {
      where.deletedAt = null;
      if (options.isActive === true) {
        where.isActive = true;
      }
    }
    if (options.organizationId) {
      where.organizationId = options.organizationId;
    }
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { city: { contains: options.search, mode: 'insensitive' } },
        { country: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findMany(options: FindManyOfficesOptions): Promise<[Office[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.office.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.office.count({ where }),
    ]);
    return [items, total];
  }
}
