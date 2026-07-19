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
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { QueryDeliverablesDto } from './dto/query-deliverables.dto';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { DeliverableEntity } from './entities/deliverable.entity';
import { DeliverablesService } from './deliverables.service';

@ApiTags('Deliverables')
@ApiBearerAuth()
@Controller('deliverables')
export class DeliverablesController {
  constructor(private readonly deliverablesService: DeliverablesService) {}

  @Post()
  @RequirePermissions('Deliverables.Create')
  @ApiOperation({ summary: 'Create a new deliverable' })
  async create(
    @Body() dto: CreateDeliverableDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<DeliverableEntity> {
    const deliverable = await this.deliverablesService.createDeliverable(
      dto,
      currentUser.sub,
    );
    return DeliverableEntity.fromPrisma(deliverable);
  }

  @Get()
  @RequirePermissions('Deliverables.View')
  @ApiOperation({
    summary:
      'List deliverables with pagination, search, filtering (by organization/project/milestone/owner/type/status), and sorting',
  })
  @ApiPaginatedResponse(DeliverableEntity)
  async findAll(
    @Query() query: QueryDeliverablesDto,
  ): Promise<{ items: DeliverableEntity[]; meta: unknown }> {
    const result = await this.deliverablesService.listDeliverables(query);
    return {
      items: result.items.map((deliverable) =>
        DeliverableEntity.fromPrisma(deliverable),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Deliverables.View')
  @ApiOperation({ summary: 'Get a deliverable by id' })
  async findOne(@Param('id') id: string): Promise<DeliverableEntity> {
    const deliverable =
      await this.deliverablesService.getDeliverableOrThrow(id);
    return DeliverableEntity.fromPrisma(deliverable);
  }

  @Patch(':id')
  @RequirePermissions('Deliverables.Update')
  @ApiOperation({ summary: 'Update a deliverable' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDeliverableDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<DeliverableEntity> {
    const deliverable = await this.deliverablesService.updateDeliverable(
      id,
      dto,
      currentUser.sub,
    );
    return DeliverableEntity.fromPrisma(deliverable);
  }

  @Delete(':id')
  @RequirePermissions('Deliverables.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a deliverable' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.deliverablesService.deleteDeliverable(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Deliverables.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted deliverable' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<DeliverableEntity> {
    const deliverable = await this.deliverablesService.restoreDeliverable(
      id,
      currentUser.sub,
    );
    return DeliverableEntity.fromPrisma(deliverable);
  }
}
