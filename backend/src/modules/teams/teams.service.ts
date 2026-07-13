import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { DepartmentsService } from '../departments/departments.service';
import type { EmployeeWithUser } from '../employees/entities/employee.entity';
import { EmployeesService } from '../employees/employees.service';
import { OrganizationsService } from '../organizations/organizations.service';
import type { CreateTeamDto } from './dto/create-team.dto';
import type { QueryTeamsDto } from './dto/query-teams.dto';
import type { UpdateTeamDto } from './dto/update-team.dto';
import type { TeamWithMemberCount } from './entities/team.entity';
import { TeamsRepository } from './teams.repository';

@Injectable()
export class TeamsService {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly departmentsService: DepartmentsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async getTeamOrThrow(id: string): Promise<TeamWithMemberCount> {
    const team = await this.teamsRepository.findById(id);
    if (!team) {
      throw new NotFoundException(`Team with id "${id}" not found`);
    }
    return team;
  }

  async listTeams(
    query: QueryTeamsDto,
  ): Promise<PaginatedResult<TeamWithMemberCount>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.teamsRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      departmentId: query.departmentId,
      teamLeaderId: query.teamLeaderId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
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

  private async assertTeamLeaderBelongsToOrganization(
    teamLeaderId: string,
    organizationId: string,
  ): Promise<void> {
    const leader = await this.employeesService.getEmployeeOrThrow(teamLeaderId);
    if (leader.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected team leader does not belong to this organization',
      );
    }
  }

  async createTeam(
    dto: CreateTeamDto,
    createdBy?: string,
  ): Promise<TeamWithMemberCount> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);

    if (dto.departmentId) {
      await this.assertDepartmentBelongsToOrganization(
        dto.departmentId,
        dto.organizationId,
      );
    }
    if (dto.teamLeaderId) {
      await this.assertTeamLeaderBelongsToOrganization(
        dto.teamLeaderId,
        dto.organizationId,
      );
    }

    const existing = await this.teamsRepository.findByOrganizationAndName(
      dto.organizationId,
      dto.name,
    );
    if (existing) {
      throw new ConflictException(
        'A team with this name already exists in this organization',
      );
    }

    return this.teamsRepository.create({ ...dto, createdBy });
  }

  async updateTeam(
    id: string,
    dto: UpdateTeamDto,
    updatedBy?: string,
  ): Promise<TeamWithMemberCount> {
    const existing = await this.getTeamOrThrow(id);
    const organizationId = dto.organizationId ?? existing.organizationId;

    if (dto.organizationId) {
      await this.organizationsService.getOrganizationOrThrow(
        dto.organizationId,
      );
    }
    if (dto.departmentId) {
      await this.assertDepartmentBelongsToOrganization(
        dto.departmentId,
        organizationId,
      );
    }
    if (dto.teamLeaderId) {
      await this.assertTeamLeaderBelongsToOrganization(
        dto.teamLeaderId,
        organizationId,
      );
    }

    if (dto.name) {
      const nameOwner = await this.teamsRepository.findByOrganizationAndName(
        organizationId,
        dto.name,
      );
      if (nameOwner && nameOwner.id !== id) {
        throw new ConflictException(
          'A team with this name already exists in this organization',
        );
      }
    }

    return this.teamsRepository.update(id, { ...dto, updatedBy });
  }

  async deleteTeam(id: string, deletedBy?: string): Promise<void> {
    const team = await this.getTeamOrThrow(id);
    if (team._count.members > 0) {
      throw new ConflictException(
        `Cannot delete a team with ${team._count.members} member(s). Remove them first.`,
      );
    }
    await this.teamsRepository.softDelete(id, deletedBy);
  }

  async restoreTeam(
    id: string,
    updatedBy?: string,
  ): Promise<TeamWithMemberCount> {
    await this.getTeamOrThrow(id);
    return this.teamsRepository.restore(id, updatedBy);
  }

  async addMember(
    teamId: string,
    employeeId: string,
    addedBy?: string,
  ): Promise<void> {
    const team = await this.getTeamOrThrow(teamId);
    if (!team.isActive) {
      throw new BadRequestException('Cannot add members to an inactive team');
    }
    const employee = await this.employeesService.getEmployeeOrThrow(employeeId);
    if (employee.organizationId !== team.organizationId) {
      throw new BadRequestException(
        'The selected employee does not belong to the same organization as this team',
      );
    }

    const existing = await this.teamsRepository.findMembership(
      teamId,
      employeeId,
    );
    if (existing) {
      throw new ConflictException(
        'This employee is already a member of this team',
      );
    }
    await this.teamsRepository.addMember(teamId, employeeId, addedBy);
  }

  async removeMember(teamId: string, employeeId: string): Promise<void> {
    await this.getTeamOrThrow(teamId);
    const existing = await this.teamsRepository.findMembership(
      teamId,
      employeeId,
    );
    if (!existing) {
      throw new NotFoundException('This employee is not a member of this team');
    }
    await this.teamsRepository.removeMember(teamId, employeeId);
  }

  async listMembersForTeam(
    teamId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<EmployeeWithUser>> {
    await this.getTeamOrThrow(teamId);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.teamsRepository.findMembersForTeam(
      teamId,
      skip,
      query.limit,
    );
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }
}
