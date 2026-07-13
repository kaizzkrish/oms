import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Client } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { ClientSortField } from './dto/query-clients.dto';

export interface CreateClientData {
  organizationId: string;
  accountManagerId?: string;
  name: string;
  code?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateClientData {
  organizationId?: string;
  accountManagerId?: string | null;
  name?: string;
  code?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyClientsOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  accountManagerId?: string;
  sortBy: ClientSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Client | null> {
    return this.prisma.client.findUnique({ where: { id } });
  }

  findByOrganizationAndName(
    organizationId: string,
    name: string,
  ): Promise<Client | null> {
    return this.prisma.client.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
  }

  create(data: CreateClientData): Promise<Client> {
    return this.prisma.client.create({ data });
  }

  update(id: string, data: UpdateClientData): Promise<Client> {
    return this.prisma.client.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy?: string): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
  }

  restore(id: string, updatedBy?: string): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
    });
  }

  private buildWhere(
    options: Pick<
      FindManyClientsOptions,
      'search' | 'isActive' | 'organizationId' | 'accountManagerId'
    >,
  ): Prisma.ClientWhereInput {
    const where: Prisma.ClientWhereInput = {};
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
    if (options.accountManagerId) {
      where.accountManagerId = options.accountManagerId;
    }
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
        { contactName: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findMany(options: FindManyClientsOptions): Promise<[Client[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
      }),
      this.prisma.client.count({ where }),
    ]);
    return [items, total];
  }
}
