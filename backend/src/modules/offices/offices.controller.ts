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
import { CreateOfficeDto } from './dto/create-office.dto';
import { QueryOfficesDto } from './dto/query-offices.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { OfficeEntity } from './entities/office.entity';
import { OfficesService } from './offices.service';

@ApiTags('Offices')
@ApiBearerAuth()
@Controller('offices')
export class OfficesController {
  constructor(private readonly officesService: OfficesService) {}

  @Post()
  @RequirePermissions('Offices.Create')
  @ApiOperation({ summary: 'Create a new office' })
  async create(
    @Body() dto: CreateOfficeDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<OfficeEntity> {
    const office = await this.officesService.createOffice(dto, currentUser.sub);
    return OfficeEntity.fromPrisma(office);
  }

  @Get()
  @RequirePermissions('Offices.View')
  @ApiOperation({
    summary:
      'List offices with pagination, search, filtering (by organization), and sorting',
  })
  @ApiPaginatedResponse(OfficeEntity)
  async findAll(
    @Query() query: QueryOfficesDto,
  ): Promise<{ items: OfficeEntity[]; meta: unknown }> {
    const result = await this.officesService.listOffices(query);
    return {
      items: result.items.map((office) => OfficeEntity.fromPrisma(office)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Offices.View')
  @ApiOperation({ summary: 'Get an office by id' })
  async findOne(@Param('id') id: string): Promise<OfficeEntity> {
    const office = await this.officesService.getOfficeOrThrow(id);
    return OfficeEntity.fromPrisma(office);
  }

  @Patch(':id')
  @RequirePermissions('Offices.Update')
  @ApiOperation({ summary: 'Update an office' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOfficeDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<OfficeEntity> {
    const office = await this.officesService.updateOffice(
      id,
      dto,
      currentUser.sub,
    );
    return OfficeEntity.fromPrisma(office);
  }

  @Delete(':id')
  @RequirePermissions('Offices.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an office' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.officesService.deleteOffice(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Offices.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted office' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<OfficeEntity> {
    const office = await this.officesService.restoreOffice(id, currentUser.sub);
    return OfficeEntity.fromPrisma(office);
  }
}
