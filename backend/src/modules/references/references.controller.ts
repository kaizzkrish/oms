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
import { CreateReferenceDto } from './dto/create-reference.dto';
import { QueryReferencesDto } from './dto/query-references.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';
import { ReferenceEntity } from './entities/reference.entity';
import { ReferencesService } from './references.service';

@ApiTags('References')
@ApiBearerAuth()
@Controller('references')
export class ReferencesController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Post()
  @RequirePermissions('References.Create')
  @ApiOperation({ summary: 'Create a new reference' })
  async create(
    @Body() dto: CreateReferenceDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ReferenceEntity> {
    const reference = await this.referencesService.createReference(
      dto,
      currentUser.sub,
    );
    return ReferenceEntity.fromPrisma(reference);
  }

  @Get()
  @RequirePermissions('References.View')
  @ApiOperation({
    summary:
      'List references with pagination, search, filtering (by organization/project/type), and sorting',
  })
  @ApiPaginatedResponse(ReferenceEntity)
  async findAll(
    @Query() query: QueryReferencesDto,
  ): Promise<{ items: ReferenceEntity[]; meta: unknown }> {
    const result = await this.referencesService.listReferences(query);
    return {
      items: result.items.map((reference) =>
        ReferenceEntity.fromPrisma(reference),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('References.View')
  @ApiOperation({ summary: 'Get a reference by id' })
  async findOne(@Param('id') id: string): Promise<ReferenceEntity> {
    const reference = await this.referencesService.getReferenceOrThrow(id);
    return ReferenceEntity.fromPrisma(reference);
  }

  @Patch(':id')
  @RequirePermissions('References.Update')
  @ApiOperation({ summary: 'Update a reference' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReferenceDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ReferenceEntity> {
    const reference = await this.referencesService.updateReference(
      id,
      dto,
      currentUser.sub,
    );
    return ReferenceEntity.fromPrisma(reference);
  }

  @Delete(':id')
  @RequirePermissions('References.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a reference' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.referencesService.deleteReference(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('References.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted reference' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<ReferenceEntity> {
    const reference = await this.referencesService.restoreReference(
      id,
      currentUser.sub,
    );
    return ReferenceEntity.fromPrisma(reference);
  }
}
