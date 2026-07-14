import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Milestone } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { EmployeesService } from '../employees/employees.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { ProjectsService } from '../projects/projects.service';
import type { CreateMilestoneDto } from './dto/create-milestone.dto';
import type { QueryMilestonesDto } from './dto/query-milestones.dto';
import type { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { MilestonesRepository } from './milestones.repository';

@Injectable()
export class MilestonesService {
  constructor(
    private readonly milestonesRepository: MilestonesRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly projectsService: ProjectsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async getMilestoneOrThrow(id: string): Promise<Milestone> {
    const milestone = await this.milestonesRepository.findById(id);
    if (!milestone) {
      throw new NotFoundException(`Milestone with id "${id}" not found`);
    }
    return milestone;
  }

  async listMilestones(
    query: QueryMilestonesDto,
  ): Promise<PaginatedResult<Milestone>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.milestonesRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      projectId: query.projectId,
      ownerId: query.ownerId,
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

  async createMilestone(
    dto: CreateMilestoneDto,
    createdBy?: string,
  ): Promise<Milestone> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);
    await this.assertProjectBelongsToOrganization(
      dto.projectId,
      dto.organizationId,
    );

    if (dto.ownerId) {
      await this.assertOwnerBelongsToOrganization(
        dto.ownerId,
        dto.organizationId,
      );
    }

    const existing = await this.milestonesRepository.findByProjectAndName(
      dto.projectId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException(
        'A milestone with this name already exists in this project',
      );
    }

    return this.milestonesRepository.create({
      ...dto,
      dueDate: new Date(dto.dueDate),
      achievedDate: dto.achievedDate ? new Date(dto.achievedDate) : undefined,
      createdBy,
    });
  }

  async updateMilestone(
    id: string,
    dto: UpdateMilestoneDto,
    updatedBy?: string,
  ): Promise<Milestone> {
    const existing = await this.getMilestoneOrThrow(id);
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
    if (dto.ownerId) {
      await this.assertOwnerBelongsToOrganization(dto.ownerId, organizationId);
    }

    if (dto.name) {
      const nameOwner = await this.milestonesRepository.findByProjectAndName(
        projectId,
        dto.name,
      );
      if (nameOwner && nameOwner.id !== id) {
        throw new ConflictException(
          'A milestone with this name already exists in this project',
        );
      }
    }

    return this.milestonesRepository.update(id, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      achievedDate:
        dto.achievedDate === null
          ? null
          : dto.achievedDate
            ? new Date(dto.achievedDate)
            : undefined,
      updatedBy,
    });
  }

  async deleteMilestone(id: string, deletedBy?: string): Promise<void> {
    await this.getMilestoneOrThrow(id);
    await this.milestonesRepository.softDelete(id, deletedBy);
  }

  async restoreMilestone(id: string, updatedBy?: string): Promise<Milestone> {
    await this.getMilestoneOrThrow(id);
    return this.milestonesRepository.restore(id, updatedBy);
  }
}
