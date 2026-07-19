import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Sprint } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { EmployeesService } from '../employees/employees.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { ProjectsService } from '../projects/projects.service';
import { TeamsService } from '../teams/teams.service';
import type { CreateSprintDto } from './dto/create-sprint.dto';
import type { QuerySprintsDto } from './dto/query-sprints.dto';
import type { UpdateSprintDto } from './dto/update-sprint.dto';
import { SprintsRepository } from './sprints.repository';

@Injectable()
export class SprintsService {
  constructor(
    private readonly sprintsRepository: SprintsRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly projectsService: ProjectsService,
    private readonly teamsService: TeamsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async getSprintOrThrow(id: string): Promise<Sprint> {
    const sprint = await this.sprintsRepository.findById(id);
    if (!sprint) {
      throw new NotFoundException(`Sprint with id "${id}" not found`);
    }
    return sprint;
  }

  async listSprints(query: QuerySprintsDto): Promise<PaginatedResult<Sprint>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.sprintsRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      projectId: query.projectId,
      teamId: query.teamId,
      scrumMasterId: query.scrumMasterId,
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

  private async assertScrumMasterBelongsToOrganization(
    scrumMasterId: string,
    organizationId: string,
  ): Promise<void> {
    const employee =
      await this.employeesService.getEmployeeOrThrow(scrumMasterId);
    if (employee.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected scrum master does not belong to this organization',
      );
    }
  }

  private assertDateRangeValid(startDate: Date, endDate: Date): void {
    if (endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }
  }

  async createSprint(
    dto: CreateSprintDto,
    createdBy?: string,
  ): Promise<Sprint> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);
    await this.assertProjectBelongsToOrganization(
      dto.projectId,
      dto.organizationId,
    );

    if (dto.teamId) {
      await this.assertTeamBelongsToOrganization(
        dto.teamId,
        dto.organizationId,
      );
    }
    if (dto.scrumMasterId) {
      await this.assertScrumMasterBelongsToOrganization(
        dto.scrumMasterId,
        dto.organizationId,
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    this.assertDateRangeValid(startDate, endDate);

    const existing = await this.sprintsRepository.findByProjectAndName(
      dto.projectId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException(
        'A sprint with this name already exists in this project',
      );
    }

    return this.sprintsRepository.create({
      ...dto,
      startDate,
      endDate,
      createdBy,
    });
  }

  async updateSprint(
    id: string,
    dto: UpdateSprintDto,
    updatedBy?: string,
  ): Promise<Sprint> {
    const existing = await this.getSprintOrThrow(id);
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
    if (dto.teamId) {
      await this.assertTeamBelongsToOrganization(dto.teamId, organizationId);
    }
    if (dto.scrumMasterId) {
      await this.assertScrumMasterBelongsToOrganization(
        dto.scrumMasterId,
        organizationId,
      );
    }

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : existing.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    this.assertDateRangeValid(startDate, endDate);

    if (dto.name) {
      const nameOwner = await this.sprintsRepository.findByProjectAndName(
        projectId,
        dto.name,
      );
      if (nameOwner && nameOwner.id !== id) {
        throw new ConflictException(
          'A sprint with this name already exists in this project',
        );
      }
    }

    return this.sprintsRepository.update(id, {
      ...dto,
      startDate: dto.startDate ? startDate : undefined,
      endDate: dto.endDate ? endDate : undefined,
      updatedBy,
    });
  }

  async deleteSprint(id: string, deletedBy?: string): Promise<void> {
    await this.getSprintOrThrow(id);
    await this.sprintsRepository.softDelete(id, deletedBy);
  }

  async restoreSprint(id: string, updatedBy?: string): Promise<Sprint> {
    await this.getSprintOrThrow(id);
    return this.sprintsRepository.restore(id, updatedBy);
  }
}
