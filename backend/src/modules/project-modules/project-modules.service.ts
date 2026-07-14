import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ProjectModule } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { EmployeesService } from '../employees/employees.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { ProjectsService } from '../projects/projects.service';
import type { CreateProjectModuleDto } from './dto/create-project-module.dto';
import type { QueryProjectModulesDto } from './dto/query-project-modules.dto';
import type { UpdateProjectModuleDto } from './dto/update-project-module.dto';
import { ProjectModulesRepository } from './project-modules.repository';

@Injectable()
export class ProjectModulesService {
  constructor(
    private readonly projectModulesRepository: ProjectModulesRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly projectsService: ProjectsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async getProjectModuleOrThrow(id: string): Promise<ProjectModule> {
    const projectModule = await this.projectModulesRepository.findById(id);
    if (!projectModule) {
      throw new NotFoundException(`Module with id "${id}" not found`);
    }
    return projectModule;
  }

  async listProjectModules(
    query: QueryProjectModulesDto,
  ): Promise<PaginatedResult<ProjectModule>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.projectModulesRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      projectId: query.projectId,
      moduleLeadId: query.moduleLeadId,
      status: query.status,
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

  private async assertModuleLeadBelongsToOrganization(
    moduleLeadId: string,
    organizationId: string,
  ): Promise<void> {
    const employee =
      await this.employeesService.getEmployeeOrThrow(moduleLeadId);
    if (employee.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected module lead does not belong to this organization',
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

  async createProjectModule(
    dto: CreateProjectModuleDto,
    createdBy?: string,
  ): Promise<ProjectModule> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);
    await this.assertProjectBelongsToOrganization(
      dto.projectId,
      dto.organizationId,
    );

    if (dto.moduleLeadId) {
      await this.assertModuleLeadBelongsToOrganization(
        dto.moduleLeadId,
        dto.organizationId,
      );
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    this.assertDateRangeValid(startDate, endDate);

    const existing = await this.projectModulesRepository.findByProjectAndName(
      dto.projectId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException(
        'A module with this name already exists in this project',
      );
    }

    return this.projectModulesRepository.create({
      ...dto,
      startDate,
      endDate,
      createdBy,
    });
  }

  async updateProjectModule(
    id: string,
    dto: UpdateProjectModuleDto,
    updatedBy?: string,
  ): Promise<ProjectModule> {
    const existing = await this.getProjectModuleOrThrow(id);
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
    if (dto.moduleLeadId) {
      await this.assertModuleLeadBelongsToOrganization(
        dto.moduleLeadId,
        organizationId,
      );
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
      const nameOwner =
        await this.projectModulesRepository.findByProjectAndName(
          projectId,
          dto.name,
        );
      if (nameOwner && nameOwner.id !== id) {
        throw new ConflictException(
          'A module with this name already exists in this project',
        );
      }
    }

    return this.projectModulesRepository.update(id, {
      ...dto,
      startDate,
      endDate,
      updatedBy,
    });
  }

  async deleteProjectModule(id: string, deletedBy?: string): Promise<void> {
    await this.getProjectModuleOrThrow(id);
    await this.projectModulesRepository.softDelete(id, deletedBy);
  }

  async restoreProjectModule(
    id: string,
    updatedBy?: string,
  ): Promise<ProjectModule> {
    await this.getProjectModuleOrThrow(id);
    return this.projectModulesRepository.restore(id, updatedBy);
  }
}
