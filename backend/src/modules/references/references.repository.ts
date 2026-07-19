import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Reference } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { ReferenceSortField } from './dto/query-references.dto';
import type { ReferenceType } from './constants/reference-type';

export interface CreateReferenceData {
  organizationId: string;
  projectId: string;
  name: string;
  url: string;
  description?: string;
  type?: ReferenceType;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateReferenceData {
  organizationId?: string;
  projectId?: string;
  name?: string;
  url?: string;
  description?: string;
  type?: ReferenceType;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyReferencesOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  type?: ReferenceType;
  sortBy: ReferenceSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class ReferencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Reference | null> {
    return this.prisma.reference.findUnique({ where: { id } });
  }

  findByProjectAndName(
    projectId: string,
    name: string,
  ): Promise<Reference | null> {
    return this.prisma.reference.findUnique({
      where: { projectId_name: { projectId, name } },
    });
  }

  create(data: CreateReferenceData): Promise<Reference> {
    return this.prisma.reference.create({ data });
  }

  update(id: string, data: UpdateReferenceData): Promise<Reference> {
    return this.prisma.reference.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy?: string): Promise<Reference> {
    return this.prisma.reference.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Reference> {
    return this.prisma.reference.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyReferencesOptions,
      'search' | 'isActive' | 'organizationId' | 'projectId' | 'type'
    >,
  ): Prisma.ReferenceWhereInput {
    const where: Prisma.ReferenceWhereInput = {};
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
    if (options.projectId) {
      where.projectId = options.projectId;
    }
    if (options.type) {
      where.type = options.type;
    }
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { url: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findMany(
    options: FindManyReferencesOptions,
  ): Promise<[Reference[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.reference.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.reference.count({ where }),
    ]);
    return [items, total];
  }
}
