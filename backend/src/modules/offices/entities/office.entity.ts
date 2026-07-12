import { ApiProperty } from '@nestjs/swagger';
import type { Office } from '../../../generated/prisma/client';

export class OfficeEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isHeadquarters: boolean;

  @ApiProperty()
  addressLine1: string;

  @ApiProperty({ nullable: true })
  addressLine2: string | null;

  @ApiProperty()
  city: string;

  @ApiProperty({ nullable: true })
  state: string | null;

  @ApiProperty()
  country: string;

  @ApiProperty({ nullable: true })
  postalCode: string | null;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: OfficeEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.name = props.name;
    this.isHeadquarters = props.isHeadquarters;
    this.addressLine1 = props.addressLine1;
    this.addressLine2 = props.addressLine2;
    this.city = props.city;
    this.state = props.state;
    this.country = props.country;
    this.postalCode = props.postalCode;
    this.phone = props.phone;
    this.email = props.email;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(office: Office): OfficeEntity {
    return new OfficeEntity({
      id: office.id,
      organizationId: office.organizationId,
      name: office.name,
      isHeadquarters: office.isHeadquarters,
      addressLine1: office.addressLine1,
      addressLine2: office.addressLine2,
      city: office.city,
      state: office.state,
      country: office.country,
      postalCode: office.postalCode,
      phone: office.phone,
      email: office.email,
      isActive: office.isActive,
      createdAt: office.createdAt,
    });
  }
}
