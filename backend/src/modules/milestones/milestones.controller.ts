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
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { QueryMilestonesDto } from './dto/query-milestones.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { MilestoneEntity } from './entities/milestone.entity';
import { MilestonesService } from './milestones.service';

@ApiTags('Milestones')
@ApiBearerAuth()
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Post()
  @RequirePermissions('Milestones.Create')
  @ApiOperation({ summary: 'Create a new milestone' })
  async create(
    @Body() dto: CreateMilestoneDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<MilestoneEntity> {
    const milestone = await this.milestonesService.createMilestone(
      dto,
      currentUser.sub,
    );
    return MilestoneEntity.fromPrisma(milestone);
  }

  @Get()
  @RequirePermissions('Milestones.View')
  @ApiOperation({
    summary:
      'List milestones with pagination, search, filtering (by organization/project/owner/status), and sorting',
  })
  @ApiPaginatedResponse(MilestoneEntity)
  async findAll(
    @Query() query: QueryMilestonesDto,
  ): Promise<{ items: MilestoneEntity[]; meta: unknown }> {
    const result = await this.milestonesService.listMilestones(query);
    return {
      items: result.items.map((milestone) =>
        MilestoneEntity.fromPrisma(milestone),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Milestones.View')
  @ApiOperation({ summary: 'Get a milestone by id' })
  async findOne(@Param('id') id: string): Promise<MilestoneEntity> {
    const milestone = await this.milestonesService.getMilestoneOrThrow(id);
    return MilestoneEntity.fromPrisma(milestone);
  }

  @Patch(':id')
  @RequirePermissions('Milestones.Update')
  @ApiOperation({ summary: 'Update a milestone' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<MilestoneEntity> {
    const milestone = await this.milestonesService.updateMilestone(
      id,
      dto,
      currentUser.sub,
    );
    return MilestoneEntity.fromPrisma(milestone);
  }

  @Delete(':id')
  @RequirePermissions('Milestones.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a milestone' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.milestonesService.deleteMilestone(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Milestones.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted milestone' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<MilestoneEntity> {
    const milestone = await this.milestonesService.restoreMilestone(
      id,
      currentUser.sub,
    );
    return MilestoneEntity.fromPrisma(milestone);
  }
}
