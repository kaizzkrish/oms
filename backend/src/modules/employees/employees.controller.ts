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
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeEntity } from './entities/employee.entity';
import { EmployeesService } from './employees.service';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermissions('Employees.Create')
  @ApiOperation({ summary: 'Create a new employee profile' })
  async create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<EmployeeEntity> {
    const employee = await this.employeesService.createEmployee(
      dto,
      currentUser.sub,
    );
    return EmployeeEntity.fromPrisma(employee);
  }

  @Get()
  @RequirePermissions('Employees.View')
  @ApiOperation({
    summary:
      'List employees with pagination, search, filtering (by organization/department/designation/office/manager/employment type), and sorting',
  })
  @ApiPaginatedResponse(EmployeeEntity)
  async findAll(
    @Query() query: QueryEmployeesDto,
  ): Promise<{ items: EmployeeEntity[]; meta: unknown }> {
    const result = await this.employeesService.listEmployees(query);
    return {
      items: result.items.map((employee) =>
        EmployeeEntity.fromPrisma(employee),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Employees.View')
  @ApiOperation({ summary: 'Get an employee by id' })
  async findOne(@Param('id') id: string): Promise<EmployeeEntity> {
    const employee = await this.employeesService.getEmployeeOrThrow(id);
    return EmployeeEntity.fromPrisma(employee);
  }

  @Patch(':id')
  @RequirePermissions('Employees.Update')
  @ApiOperation({ summary: 'Update an employee' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<EmployeeEntity> {
    const employee = await this.employeesService.updateEmployee(
      id,
      dto,
      currentUser.sub,
    );
    return EmployeeEntity.fromPrisma(employee);
  }

  @Delete(':id')
  @RequirePermissions('Employees.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an employee' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.employeesService.deleteEmployee(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Employees.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted employee' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<EmployeeEntity> {
    const employee = await this.employeesService.restoreEmployee(
      id,
      currentUser.sub,
    );
    return EmployeeEntity.fromPrisma(employee);
  }
}
