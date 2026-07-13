import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Client } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { EmployeesService } from '../employees/employees.service';
import { OrganizationsService } from '../organizations/organizations.service';
import type { CreateClientDto } from './dto/create-client.dto';
import type { QueryClientsDto } from './dto/query-clients.dto';
import type { UpdateClientDto } from './dto/update-client.dto';
import { ClientsRepository } from './clients.repository';

@Injectable()
export class ClientsService {
  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async getClientOrThrow(id: string): Promise<Client> {
    const client = await this.clientsRepository.findById(id);
    if (!client) {
      throw new NotFoundException(`Client with id "${id}" not found`);
    }
    return client;
  }

  async listClients(query: QueryClientsDto): Promise<PaginatedResult<Client>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.clientsRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      accountManagerId: query.accountManagerId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  private async assertAccountManagerBelongsToOrganization(
    accountManagerId: string,
    organizationId: string,
  ): Promise<void> {
    const manager =
      await this.employeesService.getEmployeeOrThrow(accountManagerId);
    if (manager.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected account manager does not belong to this organization',
      );
    }
  }

  async createClient(
    dto: CreateClientDto,
    createdBy?: string,
  ): Promise<Client> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);

    if (dto.accountManagerId) {
      await this.assertAccountManagerBelongsToOrganization(
        dto.accountManagerId,
        dto.organizationId,
      );
    }

    const existing = await this.clientsRepository.findByOrganizationAndName(
      dto.organizationId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException(
        'A client with this name already exists in this organization',
      );
    }

    return this.clientsRepository.create({ ...dto, createdBy });
  }

  async updateClient(
    id: string,
    dto: UpdateClientDto,
    updatedBy?: string,
  ): Promise<Client> {
    const existing = await this.getClientOrThrow(id);
    const organizationId = dto.organizationId ?? existing.organizationId;

    if (dto.organizationId) {
      await this.organizationsService.getOrganizationOrThrow(
        dto.organizationId,
      );
    }
    if (dto.accountManagerId) {
      await this.assertAccountManagerBelongsToOrganization(
        dto.accountManagerId,
        organizationId,
      );
    }

    if (dto.name) {
      const nameOwner = await this.clientsRepository.findByOrganizationAndName(
        organizationId,
        dto.name,
      );
      if (nameOwner && nameOwner.id !== id) {
        throw new ConflictException(
          'A client with this name already exists in this organization',
        );
      }
    }

    return this.clientsRepository.update(id, { ...dto, updatedBy });
  }

  async deleteClient(id: string, deletedBy?: string): Promise<void> {
    await this.getClientOrThrow(id);
    await this.clientsRepository.softDelete(id, deletedBy);
  }

  async restoreClient(id: string, updatedBy?: string): Promise<Client> {
    await this.getClientOrThrow(id);
    return this.clientsRepository.restore(id, updatedBy);
  }
}
