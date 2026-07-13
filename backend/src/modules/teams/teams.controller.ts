import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EmployeeEntity } from '../employees/entities/employee.entity';
import type { JwtAccessPayload } from '../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CreateTeamDto } from './dto/create-team.dto';
import { QueryTeamsDto } from './dto/query-teams.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamEntity } from './entities/team.entity';
import { TeamsService } from './teams.service';

@ApiTags('Teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @RequirePermissions('Teams.Create')
  @ApiOperation({ summary: 'Create a new team' })
  async create(
    @Body() dto: CreateTeamDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<TeamEntity> {
    const team = await this.teamsService.createTeam(dto, currentUser.sub);
    return TeamEntity.fromPrisma(team);
  }

  @Get()
  @RequirePermissions('Teams.View')
  @ApiOperation({
    summary:
      'List teams with pagination, search, filtering (by organization/department/leader), and sorting',
  })
  @ApiPaginatedResponse(TeamEntity)
  async findAll(
    @Query() query: QueryTeamsDto,
  ): Promise<{ items: TeamEntity[]; meta: unknown }> {
    const result = await this.teamsService.listTeams(query);
    return {
      items: result.items.map((team) => TeamEntity.fromPrisma(team)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Teams.View')
  @ApiOperation({ summary: 'Get a team by id' })
  async findOne(@Param('id') id: string): Promise<TeamEntity> {
    const team = await this.teamsService.getTeamOrThrow(id);
    return TeamEntity.fromPrisma(team);
  }

  @Patch(':id')
  @RequirePermissions('Teams.Update')
  @ApiOperation({ summary: 'Update a team' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<TeamEntity> {
    const team = await this.teamsService.updateTeam(id, dto, currentUser.sub);
    return TeamEntity.fromPrisma(team);
  }

  @Delete(':id')
  @RequirePermissions('Teams.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete a team (blocked if it still has members)',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.teamsService.deleteTeam(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Teams.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted team' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<TeamEntity> {
    const team = await this.teamsService.restoreTeam(id, currentUser.sub);
    return TeamEntity.fromPrisma(team);
  }

  @Get(':id/members')
  @RequirePermissions('Teams.View')
  @ApiOperation({ summary: 'List employees who are members of a team' })
  @ApiPaginatedResponse(EmployeeEntity)
  async findMembers(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<{ items: EmployeeEntity[]; meta: unknown }> {
    const result = await this.teamsService.listMembersForTeam(id, query);
    return {
      items: result.items.map((employee) =>
        EmployeeEntity.fromPrisma(employee),
      ),
      meta: result.meta,
    };
  }

  @Post(':id/members/:employeeId')
  @RequirePermissions('Teams.ManageMembers')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add an employee to a team' })
  async addMember(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.teamsService.addMember(id, employeeId, currentUser.sub);
  }

  @Delete(':id/members/:employeeId')
  @RequirePermissions('Teams.ManageMembers')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an employee from a team' })
  async removeMember(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
  ): Promise<void> {
    await this.teamsService.removeMember(id, employeeId);
  }
}
