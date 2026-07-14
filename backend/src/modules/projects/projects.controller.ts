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
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './entities/project.entity';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermissions('Projects.Create')
  @ApiOperation({ summary: 'Create a new project' })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ProjectEntity> {
    const project = await this.projectsService.createProject(
      dto,
      currentUser.sub,
    );
    return ProjectEntity.fromPrisma(project);
  }

  @Get()
  @RequirePermissions('Projects.View')
  @ApiOperation({
    summary:
      'List projects with pagination, search, filtering (by organization/client/department/manager/team/status/priority), and sorting',
  })
  @ApiPaginatedResponse(ProjectEntity)
  async findAll(
    @Query() query: QueryProjectsDto,
  ): Promise<{ items: ProjectEntity[]; meta: unknown }> {
    const result = await this.projectsService.listProjects(query);
    return {
      items: result.items.map((project) => ProjectEntity.fromPrisma(project)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Projects.View')
  @ApiOperation({ summary: 'Get a project by id' })
  async findOne(@Param('id') id: string): Promise<ProjectEntity> {
    const project = await this.projectsService.getProjectOrThrow(id);
    return ProjectEntity.fromPrisma(project);
  }

  @Patch(':id')
  @RequirePermissions('Projects.Update')
  @ApiOperation({ summary: 'Update a project' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ProjectEntity> {
    const project = await this.projectsService.updateProject(
      id,
      dto,
      currentUser.sub,
    );
    return ProjectEntity.fromPrisma(project);
  }

  @Delete(':id')
  @RequirePermissions('Projects.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a project' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.projectsService.deleteProject(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Projects.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted project' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ProjectEntity> {
    const project = await this.projectsService.restoreProject(
      id,
      currentUser.sub,
    );
    return ProjectEntity.fromPrisma(project);
  }
}
