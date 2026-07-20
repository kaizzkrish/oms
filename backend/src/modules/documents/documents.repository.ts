import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Document } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { DocumentSortField } from './dto/query-documents.dto';
import type { DocumentType } from './constants/document-type';

export interface CreateDocumentData {
  organizationId: string;
  projectId: string;
  name: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  description?: string;
  type?: DocumentType;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateDocumentData {
  organizationId?: string;
  projectId?: string;
  name?: string;
  description?: string;
  type?: DocumentType;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyDocumentsOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  type?: DocumentType;
  sortBy: DocumentSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Document | null> {
    return this.prisma.document.findUnique({ where: { id } });
  }

  findByProjectAndName(
    projectId: string,
    name: string,
  ): Promise<Document | null> {
    return this.prisma.document.findUnique({
      where: { projectId_name: { projectId, name } },
    });
  }

  create(data: CreateDocumentData): Promise<Document> {
    return this.prisma.document.create({ data });
  }

  update(id: string, data: UpdateDocumentData): Promise<Document> {
    return this.prisma.document.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy?: string): Promise<Document> {
    return this.prisma.document.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Document> {
    return this.prisma.document.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyDocumentsOptions,
      'search' | 'isActive' | 'organizationId' | 'projectId' | 'type'
    >,
  ): Prisma.DocumentWhereInput {
    const where: Prisma.DocumentWhereInput = {};
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
        { fileName: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findMany(
    options: FindManyDocumentsOptions,
  ): Promise<[Document[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.document.count({ where }),
    ]);
    return [items, total];
  }
}
