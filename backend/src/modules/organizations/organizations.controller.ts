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
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @RequirePermissions('Organizations.Create')
  @ApiOperation({ summary: 'Create a new organization' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<OrganizationEntity> {
    const organization = await this.organizationsService.createOrganization(
      dto,
      currentUser.sub,
    );
    return OrganizationEntity.fromPrisma(organization);
  }

  @Get()
  @RequirePermissions('Organizations.View')
  @ApiOperation({
    summary: 'List organizations with pagination, search, and filtering',
  })
  @ApiPaginatedResponse(OrganizationEntity)
  async findAll(
    @Query() query: QueryOrganizationsDto,
  ): Promise<{ items: OrganizationEntity[]; meta: unknown }> {
    const result = await this.organizationsService.listOrganizations(query);
    return {
      items: result.items.map((org) => OrganizationEntity.fromPrisma(org)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Organizations.View')
  @ApiOperation({ summary: 'Get an organization by id' })
  async findOne(@Param('id') id: string): Promise<OrganizationEntity> {
    const organization =
      await this.organizationsService.getOrganizationOrThrow(id);
    return OrganizationEntity.fromPrisma(organization);
  }

  @Patch(':id')
  @RequirePermissions('Organizations.Update')
  @ApiOperation({ summary: 'Update an organization' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<OrganizationEntity> {
    const organization = await this.organizationsService.updateOrganization(
      id,
      dto,
      currentUser.sub,
    );
    return OrganizationEntity.fromPrisma(organization);
  }

  @Delete(':id')
  @RequirePermissions('Organizations.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete an organization (blocked if it still has offices)',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.organizationsService.deleteOrganization(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Organizations.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted organization' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<OrganizationEntity> {
    const organization = await this.organizationsService.restoreOrganization(
      id,
      currentUser.sub,
    );
    return OrganizationEntity.fromPrisma(organization);
  }
}
