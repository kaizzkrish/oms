import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Project } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { ClientsService } from '../clients/clients.service';
import { DepartmentsService } from '../departments/departments.service';
import { EmployeesService } from '../employees/employees.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { TeamsService } from '../teams/teams.service';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { QueryProjectsDto } from './dto/query-projects.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly clientsService: ClientsService,
    private readonly departmentsService: DepartmentsService,
    private readonly employeesService: EmployeesService,
    private readonly teamsService: TeamsService,
  ) {}

  async getProjectOrThrow(id: string): Promise<Project> {
    const project = await this.projectsRepository.findById(id);
    if (!project) {
      throw new NotFoundException(`Project with id "${id}" not found`);
    }
    return project;
  }

  async listProjects(
    query: QueryProjectsDto,
  ): Promise<PaginatedResult<Project>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.projectsRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      clientId: query.clientId,
      departmentId: query.departmentId,
      projectManagerId: query.projectManagerId,
      teamId: query.teamId,
      status: query.status,
      priority: query.priority,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  private async assertClientBelongsToOrganization(
    clientId: string,
    organizationId: string,
  ): Promise<void> {
    const client = await this.clientsService.getClientOrThrow(clientId);
    if (client.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected client does not belong to this organization',
      );
    }
  }

  private async assertDepartmentBelongsToOrganization(
    departmentId: string,
    organizationId: string,
  ): Promise<void> {
    const department =
      await this.departmentsService.getDepartmentOrThrow(departmentId);
    if (department.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected department does not belong to this organization',
      );
    }
  }

  private async assertProjectManagerBelongsToOrganization(
    projectManagerId: string,
    organizationId: string,
  ): Promise<void> {
    const manager =
      await this.employeesService.getEmployeeOrThrow(projectManagerId);
    if (manager.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected project manager does not belong to this organization',
      );
    }
  }

  private async assertTeamBelongsToOrganization(
    teamId: string,
    organizationId: string,
  ): Promise<void> {
    const team = await this.teamsService.getTeamOrThrow(teamId);
    if (team.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected team does not belong to this organization',
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

  async createProject(
    dto: CreateProjectDto,
    createdBy?: string,
  ): Promise<Project> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);

    if (dto.clientId) {
      await this.assertClientBelongsToOrganization(
        dto.clientId,
        dto.organizationId,
      );
    }
    if (dto.departmentId) {
      await this.assertDepartmentBelongsToOrganization(
        dto.departmentId,
        dto.organizationId,
      );
    }
    if (dto.projectManagerId) {
      await this.assertProjectManagerBelongsToOrganization(
        dto.projectManagerId,
        dto.organizationId,
      );
    }
    if (dto.teamId) {
      await this.assertTeamBelongsToOrganization(
        dto.teamId,
        dto.organizationId,
      );
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    this.assertDateRangeValid(startDate, endDate);

    const existing = await this.projectsRepository.findByOrganizationAndName(
      dto.organizationId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException(
        'A project with this name already exists in this organization',
      );
    }

    return this.projectsRepository.create({
      ...dto,
      startDate,
      endDate,
      createdBy,
    });
  }

  async updateProject(
    id: string,
    dto: UpdateProjectDto,
    updatedBy?: string,
  ): Promise<Project> {
    const existing = await this.getProjectOrThrow(id);
    const organizationId = dto.organizationId ?? existing.organizationId;

    if (dto.organizationId) {
      await this.organizationsService.getOrganizationOrThrow(
        dto.organizationId,
      );
    }
    if (dto.clientId) {
      await this.assertClientBelongsToOrganization(
        dto.clientId,
        organizationId,
      );
    }
    if (dto.departmentId) {
      await this.assertDepartmentBelongsToOrganization(
        dto.departmentId,
        organizationId,
      );
    }
    if (dto.projectManagerId) {
      await this.assertProjectManagerBelongsToOrganization(
        dto.projectManagerId,
        organizationId,
      );
    }
    if (dto.teamId) {
      await this.assertTeamBelongsToOrganization(dto.teamId, organizationId);
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
      const nameOwner = await this.projectsRepository.findByOrganizationAndName(
        organizationId,
        dto.name,
      );
      if (nameOwner && nameOwner.id !== id) {
        throw new ConflictException(
          'A project with this name already exists in this organization',
        );
      }
    }

    return this.projectsRepository.update(id, {
      ...dto,
      startDate,
      endDate,
      updatedBy,
    });
  }

  async deleteProject(id: string, deletedBy?: string): Promise<void> {
    await this.getProjectOrThrow(id);
    await this.projectsRepository.softDelete(id, deletedBy);
  }

  async restoreProject(id: string, updatedBy?: string): Promise<Project> {
    await this.getProjectOrThrow(id);
    return this.projectsRepository.restore(id, updatedBy);
  }
}
