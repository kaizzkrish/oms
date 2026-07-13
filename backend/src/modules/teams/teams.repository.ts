import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { TeamMember } from '../../generated/prisma/client';
import type { TeamSortField } from './dto/query-teams.dto';
import type { TeamWithMemberCount } from './entities/team.entity';
import type { EmployeeWithUser } from '../employees/entities/employee.entity';

export interface CreateTeamData {
  organizationId: string;
  departmentId?: string;
  teamLeaderId?: string;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateTeamData {
  organizationId?: string;
  departmentId?: string | null;
  teamLeaderId?: string | null;
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface FindManyTeamsOptions {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  departmentId?: string;
  teamLeaderId?: string;
  sortBy: TeamSortField;
  sortOrder: 'asc' | 'desc';
}

const WITH_MEMBER_COUNT = {
  include: { _count: { select: { members: true } } },
} as const;

const WITH_USER = {
  include: {
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
      },
    },
  },
} as const;

@Injectable()
export class TeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<TeamWithMemberCount | null> {
    return this.prisma.team.findUnique({ where: { id }, ...WITH_MEMBER_COUNT });
  }

  findByOrganizationAndName(
    organizationId: string,
    name: string,
  ): Promise<TeamWithMemberCount | null> {
    return this.prisma.team.findUnique({
      where: { organizationId_name: { organizationId, name } },
      ...WITH_MEMBER_COUNT,
    });
  }

  create(data: CreateTeamData): Promise<TeamWithMemberCount> {
    return this.prisma.team.create({ data, ...WITH_MEMBER_COUNT });
  }

  update(id: string, data: UpdateTeamData): Promise<TeamWithMemberCount> {
    return this.prisma.team.update({
      where: { id },
      data,
      ...WITH_MEMBER_COUNT,
    });
  }

  softDelete(id: string, deletedBy?: string): Promise<TeamWithMemberCount> {
    return this.prisma.team.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
      ...WITH_MEMBER_COUNT,
    });
  }

  restore(id: string, updatedBy?: string): Promise<TeamWithMemberCount> {
    return this.prisma.team.update({
      where: { id },
      data: { isActive: true, deletedAt: null, deletedBy: null, updatedBy },
      ...WITH_MEMBER_COUNT,
    });
  }

  private buildWhere(
    options: Pick<
      FindManyTeamsOptions,
      'search' | 'isActive' | 'organizationId' | 'departmentId' | 'teamLeaderId'
    >,
  ): Prisma.TeamWhereInput {
    const where: Prisma.TeamWhereInput = {};
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
    if (options.departmentId) {
      where.departmentId = options.departmentId;
    }
    if (options.teamLeaderId) {
      where.teamLeaderId = options.teamLeaderId;
    }
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findMany(
    options: FindManyTeamsOptions,
  ): Promise<[TeamWithMemberCount[], number]> {
    const where = this.buildWhere(options);
    const [items, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { [options.sortBy]: options.sortOrder },
        ...WITH_MEMBER_COUNT,
      }),
      this.prisma.team.count({ where }),
    ]);
    return [items, total];
  }

  findMembership(
    teamId: string,
    employeeId: string,
  ): Promise<TeamMember | null> {
    return this.prisma.teamMember.findUnique({
      where: { teamId_employeeId: { teamId, employeeId } },
    });
  }

  addMember(
    teamId: string,
    employeeId: string,
    addedBy?: string,
  ): Promise<TeamMember> {
    return this.prisma.teamMember.create({
      data: { teamId, employeeId, addedBy },
    });
  }

  async removeMember(teamId: string, employeeId: string): Promise<void> {
    await this.prisma.teamMember.delete({
      where: { teamId_employeeId: { teamId, employeeId } },
    });
  }

  async findMembersForTeam(
    teamId: string,
    skip: number,
    take: number,
  ): Promise<[EmployeeWithUser[], number]> {
    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      teamMemberships: { some: { teamId } },
    };
    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { employeeCode: 'asc' },
        ...WITH_USER,
      }),
      this.prisma.employee.count({ where }),
    ]);
    return [items, total];
  }
}
