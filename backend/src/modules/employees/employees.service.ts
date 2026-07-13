import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { DepartmentsService } from '../departments/departments.service';
import { DesignationsService } from '../designations/designations.service';
import { OfficesService } from '../offices/offices.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { QueryEmployeesDto } from './dto/query-employees.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';
import type { EmployeeWithUser } from './entities/employee.entity';
import { EmployeesRepository } from './employees.repository';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly departmentsService: DepartmentsService,
    private readonly designationsService: DesignationsService,
    private readonly officesService: OfficesService,
    private readonly usersService: UsersService,
  ) {}

  async getEmployeeOrThrow(id: string): Promise<EmployeeWithUser> {
    const employee = await this.employeesRepository.findById(id);
    if (!employee) {
      throw new NotFoundException(`Employee with id "${id}" not found`);
    }
    return employee;
  }

  async listEmployees(
    query: QueryEmployeesDto,
  ): Promise<PaginatedResult<EmployeeWithUser>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.employeesRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      departmentId: query.departmentId,
      designationId: query.designationId,
      officeId: query.officeId,
      reportingManagerId: query.reportingManagerId,
      employmentType: query.employmentType,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  private async assertDepartmentBelongsToOrganization(
    departmentId: string,
    organizationId: string,
  ): Promise<void> {
    const department =
      await this.departmentsService.getDepartmentOrThrow(departmentId);
    if (department.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected department does not belong to this organization',
      );
    }
  }

  private async assertDesignationBelongsToOrganization(
    designationId: string,
    organizationId: string,
  ): Promise<void> {
    const designation =
      await this.designationsService.getDesignationOrThrow(designationId);
    if (designation.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected designation does not belong to this organization',
      );
    }
  }

  private async assertOfficeBelongsToOrganization(
    officeId: string,
    organizationId: string,
  ): Promise<void> {
    const office = await this.officesService.getOfficeOrThrow(officeId);
    if (office.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected office does not belong to this organization',
      );
    }
  }

  private async assertReportingManagerBelongsToOrganization(
    reportingManagerId: string,
    organizationId: string,
  ): Promise<void> {
    const manager = await this.getEmployeeOrThrow(reportingManagerId);
    if (manager.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected reporting manager does not belong to this organization',
      );
    }
  }

  async createEmployee(
    dto: CreateEmployeeDto,
    createdBy?: string,
  ): Promise<EmployeeWithUser> {
    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);
    await this.usersService.getUserOrThrow(dto.userId);

    const existingProfile = await this.employeesRepository.findByUserId(
      dto.userId,
    );
    if (existingProfile) {
      throw new ConflictException('This user already has an employee profile');
    }

    if (dto.departmentId) {
      await this.assertDepartmentBelongsToOrganization(
        dto.departmentId,
        dto.organizationId,
      );
    }
    if (dto.designationId) {
      await this.assertDesignationBelongsToOrganization(
        dto.designationId,
        dto.organizationId,
      );
    }
    if (dto.officeId) {
      await this.assertOfficeBelongsToOrganization(
        dto.officeId,
        dto.organizationId,
      );
    }
    if (dto.reportingManagerId) {
      await this.assertReportingManagerBelongsToOrganization(
        dto.reportingManagerId,
        dto.organizationId,
      );
    }

    const existingCode =
      await this.employeesRepository.findByOrganizationAndCode(
        dto.organizationId,
        dto.employeeCode,
      );
    if (existingCode) {
      throw new ConflictException(
        'An employee with this code already exists in this organization',
      );
    }

    return this.employeesRepository.create({
      userId: dto.userId,
      organizationId: dto.organizationId,
      departmentId: dto.departmentId,
      designationId: dto.designationId,
      officeId: dto.officeId,
      reportingManagerId: dto.reportingManagerId,
      employeeCode: dto.employeeCode,
      employmentType: dto.employmentType,
      dateOfJoining: new Date(dto.dateOfJoining),
      dateOfLeaving: dto.dateOfLeaving
        ? new Date(dto.dateOfLeaving)
        : undefined,
      phone: dto.phone,
      isActive: dto.isActive,
      createdBy,
    });
  }

  async updateEmployee(
    id: string,
    dto: UpdateEmployeeDto,
    updatedBy?: string,
  ): Promise<EmployeeWithUser> {
    const existing = await this.getEmployeeOrThrow(id);
    const organizationId = dto.organizationId ?? existing.organizationId;

    if (dto.organizationId) {
      await this.organizationsService.getOrganizationOrThrow(
        dto.organizationId,
      );
    }
    if (dto.departmentId) {
      await this.assertDepartmentBelongsToOrganization(
        dto.departmentId,
        organizationId,
      );
    }
    if (dto.designationId) {
      await this.assertDesignationBelongsToOrganization(
        dto.designationId,
        organizationId,
      );
    }
    if (dto.officeId) {
      await this.assertOfficeBelongsToOrganization(
        dto.officeId,
        organizationId,
      );
    }
    if (dto.reportingManagerId) {
      if (dto.reportingManagerId === id) {
        throw new BadRequestException(
          'An employee cannot be their own reporting manager',
        );
      }
      await this.assertReportingManagerBelongsToOrganization(
        dto.reportingManagerId,
        organizationId,
      );
    }

    if (dto.employeeCode) {
      const codeOwner =
        await this.employeesRepository.findByOrganizationAndCode(
          organizationId,
          dto.employeeCode,
        );
      if (codeOwner && codeOwner.id !== id) {
        throw new ConflictException(
          'An employee with this code already exists in this organization',
        );
      }
    }

    return this.employeesRepository.update(id, {
      organizationId: dto.organizationId,
      departmentId: dto.departmentId,
      designationId: dto.designationId,
      officeId: dto.officeId,
      reportingManagerId: dto.reportingManagerId,
      employeeCode: dto.employeeCode,
      employmentType: dto.employmentType,
      dateOfJoining: dto.dateOfJoining
        ? new Date(dto.dateOfJoining)
        : undefined,
      dateOfLeaving:
        dto.dateOfLeaving === null
          ? null
          : dto.dateOfLeaving
            ? new Date(dto.dateOfLeaving)
            : undefined,
      phone: dto.phone,
      isActive: dto.isActive,
      updatedBy,
    });
  }

  async deleteEmployee(id: string, deletedBy?: string): Promise<void> {
    await this.getEmployeeOrThrow(id);
    await this.employeesRepository.softDelete(id, deletedBy);
  }

  async restoreEmployee(
    id: string,
    updatedBy?: string,
  ): Promise<EmployeeWithUser> {
    await this.getEmployeeOrThrow(id);
    return this.employeesRepository.restore(id, updatedBy);
  }
}
