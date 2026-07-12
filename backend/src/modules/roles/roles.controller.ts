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
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { PermissionEntity } from '../permissions/entities/permission.entity';
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
  @RequirePermissions('Roles.Create')
  @ApiOperation({ summary: 'Create a new role' })
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<RoleEntity> {
    const role = await this.rolesService.createRole(dto, currentUser.sub);
    return RoleEntity.fromPrisma(role);
  }

  @Get()
  @RequirePermissions('Roles.View')
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
  @RequirePermissions('Roles.View')
  @ApiOperation({ summary: 'Get a role by id' })
  async findOne(@Param('id') id: string): Promise<RoleEntity> {
    const role = await this.rolesService.getRoleOrThrow(id);
    return RoleEntity.fromPrisma(role);
  }

  @Patch(':id')
  @RequirePermissions('Roles.Update')
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
  @RequirePermissions('Roles.Delete')
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
  @RequirePermissions('Roles.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted role' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<RoleEntity> {
    const role = await this.rolesService.restoreRole(id, currentUser.sub);
    return RoleEntity.fromPrisma(role);
  }

  @Get(':id/users')
  @RequirePermissions('Roles.View')
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
  @RequirePermissions('Roles.ManageUsers')
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
  @RequirePermissions('Roles.ManageUsers')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unassign a role from a user' })
  async unassignUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.rolesService.unassignUser(id, userId);
  }

  @Get(':id/permissions')
  @RequirePermissions('Roles.View')
  @ApiOperation({ summary: 'List permissions assigned to a role' })
  @ApiPaginatedResponse(PermissionEntity)
  async findPermissions(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<{ items: PermissionEntity[]; meta: unknown }> {
    const result = await this.rolesService.listPermissionsForRole(id, query);
    return {
      items: result.items.map((permission) =>
        PermissionEntity.fromPrisma(permission),
      ),
      meta: result.meta,
    };
  }

  @Post(':id/permissions/:permissionId')
  @RequirePermissions('Roles.ManagePermissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Assign a permission to a role' })
  async assignPermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.rolesService.assignPermission(id, permissionId, currentUser.sub);
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermissions('Roles.ManagePermissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unassign a permission from a role' })
  async unassignPermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ): Promise<void> {
    await this.rolesService.unassignPermission(id, permissionId);
  }
}
