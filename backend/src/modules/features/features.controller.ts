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
import { CreateFeatureDto } from './dto/create-feature.dto';
import { QueryFeaturesDto } from './dto/query-features.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { FeatureEntity } from './entities/feature.entity';
import { FeaturesService } from './features.service';

@ApiTags('Features')
@ApiBearerAuth()
@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Post()
  @RequirePermissions('Features.Create')
  @ApiOperation({ summary: 'Create a new feature' })
  async create(
    @Body() dto: CreateFeatureDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<FeatureEntity> {
    const feature = await this.featuresService.createFeature(
      dto,
      currentUser.sub,
    );
    return FeatureEntity.fromPrisma(feature);
  }

  @Get()
  @RequirePermissions('Features.View')
  @ApiOperation({
    summary:
      'List features with pagination, search, filtering (by organization/project/module/owner/status/priority), and sorting',
  })
  @ApiPaginatedResponse(FeatureEntity)
  async findAll(
    @Query() query: QueryFeaturesDto,
  ): Promise<{ items: FeatureEntity[]; meta: unknown }> {
    const result = await this.featuresService.listFeatures(query);
    return {
      items: result.items.map((feature) => FeatureEntity.fromPrisma(feature)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Features.View')
  @ApiOperation({ summary: 'Get a feature by id' })
  async findOne(@Param('id') id: string): Promise<FeatureEntity> {
    const feature = await this.featuresService.getFeatureOrThrow(id);
    return FeatureEntity.fromPrisma(feature);
  }

  @Patch(':id')
  @RequirePermissions('Features.Update')
  @ApiOperation({ summary: 'Update a feature' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFeatureDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<FeatureEntity> {
    const feature = await this.featuresService.updateFeature(
      id,
      dto,
      currentUser.sub,
    );
    return FeatureEntity.fromPrisma(feature);
  }

  @Delete(':id')
  @RequirePermissions('Features.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a feature' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.featuresService.deleteFeature(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Features.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted feature' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<FeatureEntity> {
    const feature = await this.featuresService.restoreFeature(
      id,
      currentUser.sub,
    );
    return FeatureEntity.fromPrisma(feature);
  }
}
