import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Deliverable } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { EmployeesService } from '../employees/employees.service';
import { MilestonesService } from '../milestones/milestones.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { ProjectsService } from '../projects/projects.service';
import type { CreateDeliverableDto } from './dto/create-deliverable.dto';
import type { QueryDeliverablesDto } from './dto/query-deliverables.dto';
import type { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { DeliverablesRepository } from './deliverables.repository';

@Injectable()
export class DeliverablesService {
  constructor(
    private readonly deliverablesRepository: DeliverablesRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly projectsService: ProjectsService,
    private readonly milestonesService: MilestonesService,
    private readonly employeesService: EmployeesService,
  ) {}

  async getDeliverableOrThrow(id: string): Promise<Deliverable> {
    const deliverable = await this.deliverablesRepository.findById(id);
    if (!deliverable) {
      throw new NotFoundException(`Deliverable with id "${id}" not found`);
    }
    return deliverable;
  }

  async listDeliverables(
    query: QueryDeliverablesDto,
  ): Promise<PaginatedResult<Deliverable>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.deliverablesRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      projectId: query.projectId,
      milestoneId: query.milestoneId,
      ownerId: query.ownerId,
      type: query.type,
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

  private async assertMilestoneBelongsToProject(
    milestoneId: string,
    projectId: string,
  ): Promise<void> {
    const milestone =
      await this.milestonesService.getMilestoneOrThrow(milestoneId);
    if (milestone.projectId !== projectId) {
      throw new BadRequestException(
        'The selected milestone does not belong to this project',
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

  async createDeliverable(
    dto: CreateDeliverableDto,
    createdBy?: string,
  ): Promise<Deliverable> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);
    await this.assertProjectBelongsToOrganization(
      dto.projectId,
      dto.organizationId,
    );

    if (dto.milestoneId) {
      await this.assertMilestoneBelongsToProject(
        dto.milestoneId,
        dto.projectId,
      );
    }
    if (dto.ownerId) {
      await this.assertOwnerBelongsToOrganization(
        dto.ownerId,
        dto.organizationId,
      );
    }

    const existing = await this.deliverablesRepository.findByProjectAndName(
      dto.projectId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException(
        'A deliverable with this name already exists in this project',
      );
    }

    return this.deliverablesRepository.create({
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      submittedDate: dto.submittedDate
        ? new Date(dto.submittedDate)
        : undefined,
      createdBy,
    });
  }

  async updateDeliverable(
    id: string,
    dto: UpdateDeliverableDto,
    updatedBy?: string,
  ): Promise<Deliverable> {
    const existing = await this.getDeliverableOrThrow(id);
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
    if (dto.milestoneId) {
      await this.assertMilestoneBelongsToProject(dto.milestoneId, projectId);
    }
    if (dto.ownerId) {
      await this.assertOwnerBelongsToOrganization(dto.ownerId, organizationId);
    }

    if (dto.name) {
      const nameOwner = await this.deliverablesRepository.findByProjectAndName(
        projectId,
        dto.name,
      );
      if (nameOwner && nameOwner.id !== id) {
        throw new ConflictException(
          'A deliverable with this name already exists in this project',
        );
      }
    }

    return this.deliverablesRepository.update(id, {
      ...dto,
      dueDate:
        dto.dueDate === null
          ? null
          : dto.dueDate
            ? new Date(dto.dueDate)
            : undefined,
      submittedDate:
        dto.submittedDate === null
          ? null
          : dto.submittedDate
            ? new Date(dto.submittedDate)
            : undefined,
      updatedBy,
    });
  }

  async deleteDeliverable(id: string, deletedBy?: string): Promise<void> {
    await this.getDeliverableOrThrow(id);
    await this.deliverablesRepository.softDelete(id, deletedBy);
  }

  async restoreDeliverable(
    id: string,
    updatedBy?: string,
  ): Promise<Deliverable> {
    await this.getDeliverableOrThrow(id);
    return this.deliverablesRepository.restore(id, updatedBy);
  }
}
