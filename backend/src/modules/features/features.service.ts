import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Feature } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { EmployeesService } from '../employees/employees.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { ProjectModulesService } from '../project-modules/project-modules.service';
import { ProjectsService } from '../projects/projects.service';
import type { CreateFeatureDto } from './dto/create-feature.dto';
import type { QueryFeaturesDto } from './dto/query-features.dto';
import type { UpdateFeatureDto } from './dto/update-feature.dto';
import { FeaturesRepository } from './features.repository';

@Injectable()
export class FeaturesService {
  constructor(
    private readonly featuresRepository: FeaturesRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly projectsService: ProjectsService,
    private readonly projectModulesService: ProjectModulesService,
    private readonly employeesService: EmployeesService,
  ) {}

  async getFeatureOrThrow(id: string): Promise<Feature> {
    const feature = await this.featuresRepository.findById(id);
    if (!feature) {
      throw new NotFoundException(`Feature with id "${id}" not found`);
    }
    return feature;
  }

  async listFeatures(
    query: QueryFeaturesDto,
  ): Promise<PaginatedResult<Feature>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.featuresRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      projectId: query.projectId,
      moduleId: query.moduleId,
      ownerId: query.ownerId,
      status: query.status,
      priority: query.priority,
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

  private async assertModuleBelongsToProject(
    moduleId: string,
    projectId: string,
  ): Promise<void> {
    const projectModule =
      await this.projectModulesService.getProjectModuleOrThrow(moduleId);
    if (projectModule.projectId !== projectId) {
      throw new BadRequestException(
        'The selected module does not belong to this project',
      );
    }
  }

  private async assertOwnerBelongsToOrganization(
    ownerId: string,
    organizationId: string,
  ): Promise<void> {
    const employee = await this.employeesService.getEmployeeOrThrow(ownerId);
    if (employee.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected owner does not belong to this organization',
      );
    }
  }

  private assertDateRangeValid(
    startDate?: Date | null,
    endDate?: Date | null,
  ): void {
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }
  }

  async createFeature(
    dto: CreateFeatureDto,
    createdBy?: string,
  ): Promise<Feature> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);
    await this.assertProjectBelongsToOrganization(
      dto.projectId,
      dto.organizationId,
    );
    await this.assertModuleBelongsToProject(dto.moduleId, dto.projectId);

    if (dto.ownerId) {
      await this.assertOwnerBelongsToOrganization(
        dto.ownerId,
        dto.organizationId,
      );
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    this.assertDateRangeValid(startDate, endDate);

    const existing = await this.featuresRepository.findByModuleAndName(
      dto.moduleId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException(
        'A feature with this name already exists in this module',
      );
    }

    return this.featuresRepository.create({
      ...dto,
      startDate,
      endDate,
      createdBy,
    });
  }

  async updateFeature(
    id: string,
    dto: UpdateFeatureDto,
    updatedBy?: string,
  ): Promise<Feature> {
    const existing = await this.getFeatureOrThrow(id);
    const organizationId = dto.organizationId ?? existing.organizationId;
    const projectId = dto.projectId ?? existing.projectId;
    const moduleId = dto.moduleId ?? existing.moduleId;

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
    if (dto.moduleId) {
      await this.assertModuleBelongsToProject(dto.moduleId, projectId);
    }
    if (dto.ownerId) {
      await this.assertOwnerBelongsToOrganization(dto.ownerId, organizationId);
    }

    const startDate =
      dto.startDate === null
        ? null
        : dto.startDate
          ? new Date(dto.startDate)
          : undefined;
    const endDate =
      dto.endDate === null
        ? null
        : dto.endDate
          ? new Date(dto.endDate)
          : undefined;
    this.assertDateRangeValid(
      startDate === undefined ? existing.startDate : startDate,
      endDate === undefined ? existing.endDate : endDate,
    );

    if (dto.name) {
      const nameOwner = await this.featuresRepository.findByModuleAndName(
        moduleId,
        dto.name,
      );
      if (nameOwner && nameOwner.id !== id) {
        throw new ConflictException(
          'A feature with this name already exists in this module',
        );
      }
    }

    return this.featuresRepository.update(id, {
      ...dto,
      startDate,
      endDate,
      updatedBy,
    });
  }

  async deleteFeature(id: string, deletedBy?: string): Promise<void> {
    await this.getFeatureOrThrow(id);
    await this.featuresRepository.softDelete(id, deletedBy);
  }

  async restoreFeature(id: string, updatedBy?: string): Promise<Feature> {
    await this.getFeatureOrThrow(id);
    return this.featuresRepository.restore(id, updatedBy);
  }
}
