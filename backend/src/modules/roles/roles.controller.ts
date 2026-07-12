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
import type { JwtAccessPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserEntity } from '../users/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { QueryRolesDto } from './dto/query-roles.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleEntity } from './entities/role.entity';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<RoleEntity> {
    const role = await this.rolesService.createRole(dto, currentUser.sub);
    return RoleEntity.fromPrisma(role);
  }

  @Get()
  @ApiOperation({
    summary: 'List roles with pagination, search, filtering, and sorting',
  })
  @ApiPaginatedResponse(RoleEntity)
  async findAll(
    @Query() query: QueryRolesDto,
  ): Promise<{ items: RoleEntity[]; meta: unknown }> {
    const result = await this.rolesService.listRoles(query);
    return {
      items: result.items.map((role) => RoleEntity.fromPrisma(role)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a role by id' })
  async findOne(@Param('id') id: string): Promise<RoleEntity> {
    const role = await this.rolesService.getRoleOrThrow(id);
    return RoleEntity.fromPrisma(role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a role' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<RoleEntity> {
    const role = await this.rolesService.updateRole(id, dto, currentUser.sub);
    return RoleEntity.fromPrisma(role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete a role (blocked if system or assigned to users)',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.rolesService.deleteRole(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted role' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<RoleEntity> {
    const role = await this.rolesService.restoreRole(id, currentUser.sub);
    return RoleEntity.fromPrisma(role);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'List users assigned to a role' })
  @ApiPaginatedResponse(UserEntity)
  async findUsers(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<{ items: UserEntity[]; meta: unknown }> {
    const result = await this.rolesService.listUsersForRole(id, query);
    return {
      items: result.items.map((user) => UserEntity.fromPrisma(user)),
      meta: result.meta,
    };
  }

  @Post(':id/users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Assign a role to a user' })
  async assignUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.rolesService.assignUser(id, userId, currentUser.sub);
  }

  @Delete(':id/users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unassign a role from a user' })
  async unassignUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.rolesService.unassignUser(id, userId);
  }
}
