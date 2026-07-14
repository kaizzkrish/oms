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
import { CreateProjectModuleDto } from './dto/create-project-module.dto';
import { QueryProjectModulesDto } from './dto/query-project-modules.dto';
import { UpdateProjectModuleDto } from './dto/update-project-module.dto';
import { ProjectModuleEntity } from './entities/project-module.entity';
import { ProjectModulesService } from './project-modules.service';

@ApiTags('Project Modules')
@ApiBearerAuth()
@Controller('project-modules')
export class ProjectModulesController {
  constructor(private readonly projectModulesService: ProjectModulesService) {}

  @Post()
  @RequirePermissions('ProjectModules.Create')
  @ApiOperation({ summary: 'Create a new project module' })
  async create(
    @Body() dto: CreateProjectModuleDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ProjectModuleEntity> {
    const projectModule = await this.projectModulesService.createProjectModule(
      dto,
      currentUser.sub,
    );
    return ProjectModuleEntity.fromPrisma(projectModule);
  }

  @Get()
  @RequirePermissions('ProjectModules.View')
  @ApiOperation({
    summary:
      'List project modules with pagination, search, filtering (by organization/project/module lead/status), and sorting',
  })
  @ApiPaginatedResponse(ProjectModuleEntity)
  async findAll(
    @Query() query: QueryProjectModulesDto,
  ): Promise<{ items: ProjectModuleEntity[]; meta: unknown }> {
    const result = await this.projectModulesService.listProjectModules(query);
    return {
      items: result.items.map((projectModule) =>
        ProjectModuleEntity.fromPrisma(projectModule),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('ProjectModules.View')
  @ApiOperation({ summary: 'Get a project module by id' })
  async findOne(@Param('id') id: string): Promise<ProjectModuleEntity> {
    const projectModule =
      await this.projectModulesService.getProjectModuleOrThrow(id);
    return ProjectModuleEntity.fromPrisma(projectModule);
  }

  @Patch(':id')
  @RequirePermissions('ProjectModules.Update')
  @ApiOperation({ summary: 'Update a project module' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectModuleDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ProjectModuleEntity> {
    const projectModule = await this.projectModulesService.updateProjectModule(
      id,
      dto,
      currentUser.sub,
    );
    return ProjectModuleEntity.fromPrisma(projectModule);
  }

  @Delete(':id')
  @RequirePermissions('ProjectModules.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a project module' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.projectModulesService.deleteProjectModule(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('ProjectModules.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted project module' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ProjectModuleEntity> {
    const projectModule = await this.projectModulesService.restoreProjectModule(
      id,
      currentUser.sub,
    );
    return ProjectModuleEntity.fromPrisma(projectModule);
  }
}
