import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Reference } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { OrganizationsService } from '../organizations/organizations.service';
import { ProjectsService } from '../projects/projects.service';
import type { CreateReferenceDto } from './dto/create-reference.dto';
import type { QueryReferencesDto } from './dto/query-references.dto';
import type { UpdateReferenceDto } from './dto/update-reference.dto';
import { ReferencesRepository } from './references.repository';

@Injectable()
export class ReferencesService {
  constructor(
    private readonly referencesRepository: ReferencesRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly projectsService: ProjectsService,
  ) {}

  async getReferenceOrThrow(id: string): Promise<Reference> {
    const reference = await this.referencesRepository.findById(id);
    if (!reference) {
      throw new NotFoundException(`Reference with id "${id}" not found`);
    }
    return reference;
  }

  async listReferences(
    query: QueryReferencesDto,
  ): Promise<PaginatedResult<Reference>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.referencesRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      projectId: query.projectId,
      type: query.type,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  private async assertProjectBelongsToOrganization(
    projectId: string,
    organizationId: string,
  ): Promise<void> {
    const project = await this.projectsService.getProjectOrThrow(projectId);
    if (project.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected project does not belong to this organization',
      );
    }
  }

  async createReference(
    dto: CreateReferenceDto,
    createdBy?: string,
  ): Promise<Reference> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);
    await this.assertProjectBelongsToOrganization(
      dto.projectId,
      dto.organizationId,
    );

    const existing = await this.referencesRepository.findByProjectAndName(
      dto.projectId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException(
        'A reference with this name already exists in this project',
      );
    }

    return this.referencesRepository.create({ ...dto, createdBy });
  }

  async updateReference(
    id: string,
    dto: UpdateReferenceDto,
    updatedBy?: string,
  ): Promise<Reference> {
    const existing = await this.getReferenceOrThrow(id);
    const organizationId = dto.organizationId ?? existing.organizationId;
    const projectId = dto.projectId ?? existing.projectId;

    if (dto.organizationId) {
      await this.organizationsService.getOrganizationOrThrow(
        dto.organizationId,
      );
    }
    if (dto.projectId) {
      await this.assertProjectBelongsToOrganization(
        dto.projectId,
        organizationId,
      );
    }

    if (dto.name) {
      const nameOwner = await this.referencesRepository.findByProjectAndName(
        projectId,
        dto.name,
      );
      if (nameOwner && nameOwner.id !== id) {
        throw new ConflictException(
          'A reference with this name already exists in this project',
        );
      }
    }

    return this.referencesRepository.update(id, { ...dto, updatedBy });
  }

  async deleteReference(id: string, deletedBy?: string): Promise<void> {
    await this.getReferenceOrThrow(id);
    await this.referencesRepository.softDelete(id, deletedBy);
  }

  async restoreReference(id: string, updatedBy?: string): Promise<Reference> {
    await this.getReferenceOrThrow(id);
    return this.referencesRepository.restore(id, updatedBy);
  }
}
