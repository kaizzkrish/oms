import { ApiProperty } from '@nestjs/swagger';
import type { Organization } from '../../../generated/prisma/client';

export type OrganizationWithOfficeCount = Organization & {
  _count: { offices: number };
};

export class OrganizationEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  legalName: string | null;

  @ApiProperty({ nullable: true })
  registrationNumber: string | null;

  @ApiProperty({ nullable: true })
  industry: string | null;

  @ApiProperty({ nullable: true })
  website: string | null;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ nullable: true })
  logoUrl: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  officeCount: number;

  @ApiProperty()
  createdAt: Date;

  constructor(props: OrganizationEntity) {
    this.id = props.id;
    this.name = props.name;
    this.legalName = props.legalName;
    this.registrationNumber = props.registrationNumber;
    this.industry = props.industry;
    this.website = props.website;
    this.email = props.email;
    this.phone = props.phone;
    this.logoUrl = props.logoUrl;
    this.isActive = props.isActive;
    this.officeCount = props.officeCount;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(org: OrganizationWithOfficeCount): OrganizationEntity {
    return new OrganizationEntity({
      id: org.id,
      name: org.name,
      legalName: org.legalName,
      registrationNumber: org.registrationNumber,
      industry: org.industry,
      website: org.website,
      email: org.email,
      phone: org.phone,
      logoUrl: org.logoUrl,
      isActive: org.isActive,
      officeCount: org._count.offices,
      createdAt: org.createdAt,
    });
  }
}
