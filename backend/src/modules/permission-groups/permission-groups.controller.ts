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
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { QueryPermissionGroupsDto } from './dto/query-permission-groups.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';
import { PermissionGroupEntity } from './entities/permission-group.entity';
import { PermissionGroupsService } from './permission-groups.service';

@ApiTags('Permission Groups')
@ApiBearerAuth()
@Controller('permission-groups')
export class PermissionGroupsController {
  constructor(
    private readonly permissionGroupsService: PermissionGroupsService,
  ) {}

  @Post()
  @RequirePermissions('PermissionGroups.Create')
  @ApiOperation({ summary: 'Create a new permission group' })
  async create(
    @Body() dto: CreatePermissionGroupDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<PermissionGroupEntity> {
    const group = await this.permissionGroupsService.createGroup(
      dto,
      currentUser.sub,
    );
    return PermissionGroupEntity.fromPrisma(group);
  }

  @Get()
  @RequirePermissions('PermissionGroups.View')
  @ApiOperation({
    summary: 'List permission groups with pagination, search, and filtering',
  })
  @ApiPaginatedResponse(PermissionGroupEntity)
  async findAll(
    @Query() query: QueryPermissionGroupsDto,
  ): Promise<{ items: PermissionGroupEntity[]; meta: unknown }> {
    const result = await this.permissionGroupsService.listGroups(query);
    return {
      items: result.items.map((group) =>
        PermissionGroupEntity.fromPrisma(group),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('PermissionGroups.View')
  @ApiOperation({ summary: 'Get a permission group by id' })
  async findOne(@Param('id') id: string): Promise<PermissionGroupEntity> {
    const group = await this.permissionGroupsService.getGroupOrThrow(id);
    return PermissionGroupEntity.fromPrisma(group);
  }

  @Patch(':id')
  @RequirePermissions('PermissionGroups.Update')
  @ApiOperation({ summary: 'Update a permission group' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionGroupDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<PermissionGroupEntity> {
    const group = await this.permissionGroupsService.updateGroup(
      id,
      dto,
      currentUser.sub,
    );
    return PermissionGroupEntity.fromPrisma(group);
  }

  @Delete(':id')
  @RequirePermissions('PermissionGroups.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Soft-delete a permission group (blocked if it still contains permissions)',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.permissionGroupsService.deleteGroup(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('PermissionGroups.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted permission group' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<PermissionGroupEntity> {
    const group = await this.permissionGroupsService.restoreGroup(
      id,
      currentUser.sub,
    );
    return PermissionGroupEntity.fromPrisma(group);
  }
}
