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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { QueryPermissionsDto } from './dto/query-permissions.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionEntity } from './entities/permission.entity';
import { PermissionsService } from './permissions.service';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @RequirePermissions('Permissions.Create')
  @ApiOperation({ summary: 'Create a new permission' })
  async create(
    @Body() dto: CreatePermissionDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<PermissionEntity> {
    const permission = await this.permissionsService.createPermission(
      dto,
      currentUser.sub,
    );
    return PermissionEntity.fromPrisma(permission);
  }

  @Get()
  @RequirePermissions('Permissions.View')
  @ApiOperation({
    summary: 'List permissions with pagination, search, and filtering',
  })
  @ApiPaginatedResponse(PermissionEntity)
  async findAll(
    @Query() query: QueryPermissionsDto,
  ): Promise<{ items: PermissionEntity[]; meta: unknown }> {
    const result = await this.permissionsService.listPermissions(query);
    return {
      items: result.items.map((permission) =>
        PermissionEntity.fromPrisma(permission),
      ),
      meta: result.meta,
    };
  }

  @Get('me')
  @ApiOperation({
    summary: "Get the current user's effective permission names",
  })
  async getMyPermissions(
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<string[]> {
    const names = await this.permissionsService.getEffectivePermissionNames(
      currentUser.sub,
    );
    return [...names];
  }

  @Get(':id')
  @RequirePermissions('Permissions.View')
  @ApiOperation({ summary: 'Get a permission by id' })
  async findOne(@Param('id') id: string): Promise<PermissionEntity> {
    const permission = await this.permissionsService.getPermissionOrThrow(id);
    return PermissionEntity.fromPrisma(permission);
  }

  @Patch(':id')
  @RequirePermissions('Permissions.Update')
  @ApiOperation({ summary: 'Update a permission' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<PermissionEntity> {
    const permission = await this.permissionsService.updatePermission(
      id,
      dto,
      currentUser.sub,
    );
    return PermissionEntity.fromPrisma(permission);
  }

  @Delete(':id')
  @RequirePermissions('Permissions.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Soft-delete a permission (blocked if system or assigned to roles)',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.permissionsService.deletePermission(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Permissions.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted permission' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<PermissionEntity> {
    const permission = await this.permissionsService.restorePermission(
      id,
      currentUser.sub,
    );
    return PermissionEntity.fromPrisma(permission);
  }
}
