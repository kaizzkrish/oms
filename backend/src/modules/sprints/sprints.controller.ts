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
import { CreateSprintDto } from './dto/create-sprint.dto';
import { QuerySprintsDto } from './dto/query-sprints.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { SprintEntity } from './entities/sprint.entity';
import { SprintsService } from './sprints.service';

@ApiTags('Sprints')
@ApiBearerAuth()
@Controller('sprints')
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post()
  @RequirePermissions('Sprints.Create')
  @ApiOperation({ summary: 'Create a new sprint' })
  async create(
    @Body() dto: CreateSprintDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<SprintEntity> {
    const sprint = await this.sprintsService.createSprint(dto, currentUser.sub);
    return SprintEntity.fromPrisma(sprint);
  }

  @Get()
  @RequirePermissions('Sprints.View')
  @ApiOperation({
    summary:
      'List sprints with pagination, search, filtering (by organization/project/team/scrum master/status), and sorting',
  })
  @ApiPaginatedResponse(SprintEntity)
  async findAll(
    @Query() query: QuerySprintsDto,
  ): Promise<{ items: SprintEntity[]; meta: unknown }> {
    const result = await this.sprintsService.listSprints(query);
    return {
      items: result.items.map((sprint) => SprintEntity.fromPrisma(sprint)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Sprints.View')
  @ApiOperation({ summary: 'Get a sprint by id' })
  async findOne(@Param('id') id: string): Promise<SprintEntity> {
    const sprint = await this.sprintsService.getSprintOrThrow(id);
    return SprintEntity.fromPrisma(sprint);
  }

  @Patch(':id')
  @RequirePermissions('Sprints.Update')
  @ApiOperation({ summary: 'Update a sprint' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSprintDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<SprintEntity> {
    const sprint = await this.sprintsService.updateSprint(
      id,
      dto,
      currentUser.sub,
    );
    return SprintEntity.fromPrisma(sprint);
  }

  @Delete(':id')
  @RequirePermissions('Sprints.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a sprint' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.sprintsService.deleteSprint(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Sprints.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted sprint' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<SprintEntity> {
    const sprint = await this.sprintsService.restoreSprint(id, currentUser.sub);
    return SprintEntity.fromPrisma(sprint);
  }
}
