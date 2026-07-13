import { ApiProperty } from '@nestjs/swagger';
import type { Employee } from '../../../generated/prisma/client';
import type { EmploymentType } from '../constants/employment-type';

export type EmployeeWithUser = Employee & {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
  };
};

class EmployeeUserSummary {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  isActive!: boolean;
}

export class EmployeeEntity {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: EmployeeUserSummary })
  user: EmployeeUserSummary;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ nullable: true })
  departmentId: string | null;

  @ApiProperty({ nullable: true })
  designationId: string | null;

  @ApiProperty({ nullable: true })
  officeId: string | null;

  @ApiProperty({ nullable: true })
  reportingManagerId: string | null;

  @ApiProperty()
  employeeCode: string;

  @ApiProperty()
  employmentType: EmploymentType;

  @ApiProperty()
  dateOfJoining: Date;

  @ApiProperty({ nullable: true })
  dateOfLeaving: Date | null;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: EmployeeEntity) {
    this.id = props.id;
    this.user = props.user;
    this.organizationId = props.organizationId;
    this.departmentId = props.departmentId;
    this.designationId = props.designationId;
    this.officeId = props.officeId;
    this.reportingManagerId = props.reportingManagerId;
    this.employeeCode = props.employeeCode;
    this.employmentType = props.employmentType;
    this.dateOfJoining = props.dateOfJoining;
    this.dateOfLeaving = props.dateOfLeaving;
    this.phone = props.phone;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(employee: EmployeeWithUser): EmployeeEntity {
    return new EmployeeEntity({
      id: employee.id,
      user: {
        id: employee.user.id,
        firstName: employee.user.firstName,
        lastName: employee.user.lastName,
        email: employee.user.email,
        isActive: employee.user.isActive,
      },
      organizationId: employee.organizationId,
      departmentId: employee.departmentId,
      designationId: employee.designationId,
      officeId: employee.officeId,
      reportingManagerId: employee.reportingManagerId,
      employeeCode: employee.employeeCode,
      employmentType: employee.employmentType as EmploymentType,
      dateOfJoining: employee.dateOfJoining,
      dateOfLeaving: employee.dateOfLeaving,
      phone: employee.phone,
      isActive: employee.isActive,
      createdAt: employee.createdAt,
    });
  }
}
