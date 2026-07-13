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
import { CreateDesignationDto } from './dto/create-designation.dto';
import { QueryDesignationsDto } from './dto/query-designations.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';
import { DesignationEntity } from './entities/designation.entity';
import { DesignationsService } from './designations.service';

@ApiTags('Designations')
@ApiBearerAuth()
@Controller('designations')
export class DesignationsController {
  constructor(private readonly designationsService: DesignationsService) {}

  @Post()
  @RequirePermissions('Designations.Create')
  @ApiOperation({ summary: 'Create a new designation' })
  async create(
    @Body() dto: CreateDesignationDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<DesignationEntity> {
    const designation = await this.designationsService.createDesignation(
      dto,
      currentUser.sub,
    );
    return DesignationEntity.fromPrisma(designation);
  }

  @Get()
  @RequirePermissions('Designations.View')
  @ApiOperation({
    summary:
      'List designations with pagination, search, filtering (by organization/department), and sorting',
  })
  @ApiPaginatedResponse(DesignationEntity)
  async findAll(
    @Query() query: QueryDesignationsDto,
  ): Promise<{ items: DesignationEntity[]; meta: unknown }> {
    const result = await this.designationsService.listDesignations(query);
    return {
      items: result.items.map((designation) =>
        DesignationEntity.fromPrisma(designation),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Designations.View')
  @ApiOperation({ summary: 'Get a designation by id' })
  async findOne(@Param('id') id: string): Promise<DesignationEntity> {
    const designation =
      await this.designationsService.getDesignationOrThrow(id);
    return DesignationEntity.fromPrisma(designation);
  }

  @Patch(':id')
  @RequirePermissions('Designations.Update')
  @ApiOperation({ summary: 'Update a designation' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDesignationDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<DesignationEntity> {
    const designation = await this.designationsService.updateDesignation(
      id,
      dto,
      currentUser.sub,
    );
    return DesignationEntity.fromPrisma(designation);
  }

  @Delete(':id')
  @RequirePermissions('Designations.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a designation' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.designationsService.deleteDesignation(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Designations.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted designation' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<DesignationEntity> {
    const designation = await this.designationsService.restoreDesignation(
      id,
      currentUser.sub,
    );
    return DesignationEntity.fromPrisma(designation);
  }
}
