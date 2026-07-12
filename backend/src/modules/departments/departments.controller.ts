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
import { CreateDepartmentDto } from './dto/create-department.dto';
import { QueryDepartmentsDto } from './dto/query-departments.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentEntity } from './entities/department.entity';
import { DepartmentsService } from './departments.service';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermissions('Departments.Create')
  @ApiOperation({ summary: 'Create a new department' })
  async create(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<DepartmentEntity> {
    const department = await this.departmentsService.createDepartment(
      dto,
      currentUser.sub,
    );
    return DepartmentEntity.fromPrisma(department);
  }

  @Get()
  @RequirePermissions('Departments.View')
  @ApiOperation({
    summary:
      'List departments with pagination, search, filtering (by organization/office), and sorting',
  })
  @ApiPaginatedResponse(DepartmentEntity)
  async findAll(
    @Query() query: QueryDepartmentsDto,
  ): Promise<{ items: DepartmentEntity[]; meta: unknown }> {
    const result = await this.departmentsService.listDepartments(query);
    return {
      items: result.items.map((department) =>
        DepartmentEntity.fromPrisma(department),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Departments.View')
  @ApiOperation({ summary: 'Get a department by id' })
  async findOne(@Param('id') id: string): Promise<DepartmentEntity> {
    const department = await this.departmentsService.getDepartmentOrThrow(id);
    return DepartmentEntity.fromPrisma(department);
  }

  @Patch(':id')
  @RequirePermissions('Departments.Update')
  @ApiOperation({ summary: 'Update a department' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<DepartmentEntity> {
    const department = await this.departmentsService.updateDepartment(
      id,
      dto,
      currentUser.sub,
    );
    return DepartmentEntity.fromPrisma(department);
  }

  @Delete(':id')
  @RequirePermissions('Departments.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a department' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.departmentsService.deleteDepartment(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Departments.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted department' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<DepartmentEntity> {
    const department = await this.departmentsService.restoreDepartment(
      id,
      currentUser.sub,
    );
    return DepartmentEntity.fromPrisma(department);
  }
}
