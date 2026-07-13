import { ApiProperty } from '@nestjs/swagger';
import type { Client } from '../../../generated/prisma/client';

export class ClientEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ nullable: true })
  accountManagerId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  code: string | null;

  @ApiProperty({ nullable: true })
  industry: string | null;

  @ApiProperty({ nullable: true })
  website: string | null;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ nullable: true })
  addressLine1: string | null;

  @ApiProperty({ nullable: true })
  addressLine2: string | null;

  @ApiProperty({ nullable: true })
  city: string | null;

  @ApiProperty({ nullable: true })
  state: string | null;

  @ApiProperty({ nullable: true })
  country: string | null;

  @ApiProperty({ nullable: true })
  postalCode: string | null;

  @ApiProperty({ nullable: true })
  contactName: string | null;

  @ApiProperty({ nullable: true })
  contactEmail: string | null;

  @ApiProperty({ nullable: true })
  contactPhone: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: ClientEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.accountManagerId = props.accountManagerId;
    this.name = props.name;
    this.code = props.code;
    this.industry = props.industry;
    this.website = props.website;
    this.email = props.email;
    this.phone = props.phone;
    this.addressLine1 = props.addressLine1;
    this.addressLine2 = props.addressLine2;
    this.city = props.city;
    this.state = props.state;
    this.country = props.country;
    this.postalCode = props.postalCode;
    this.contactName = props.contactName;
    this.contactEmail = props.contactEmail;
    this.contactPhone = props.contactPhone;
    this.description = props.description;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(client: Client): ClientEntity {
    return new ClientEntity({
      id: client.id,
      organizationId: client.organizationId,
      accountManagerId: client.accountManagerId,
      name: client.name,
      code: client.code,
      industry: client.industry,
      website: client.website,
      email: client.email,
      phone: client.phone,
      addressLine1: client.addressLine1,
      addressLine2: client.addressLine2,
      city: client.city,
      state: client.state,
      country: client.country,
      postalCode: client.postalCode,
      contactName: client.contactName,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone,
      description: client.description,
      isActive: client.isActive,
      createdAt: client.createdAt,
    });
  }
}
