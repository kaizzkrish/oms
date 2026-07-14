import { ApiProperty } from '@nestjs/swagger';
import type { Feature } from '../../../generated/prisma/client';
import type { FeaturePriority } from '../constants/feature-priority';
import type { FeatureStatus } from '../constants/feature-status';

export class FeatureEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  moduleId: string;

  @ApiProperty({ nullable: true })
  ownerId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  code: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  status: FeatureStatus;

  @ApiProperty()
  priority: FeaturePriority;

  @ApiProperty({ nullable: true })
  startDate: Date | null;

  @ApiProperty({ nullable: true })
  endDate: Date | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: FeatureEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.projectId = props.projectId;
    this.moduleId = props.moduleId;
    this.ownerId = props.ownerId;
    this.name = props.name;
    this.code = props.code;
    this.description = props.description;
    this.status = props.status;
    this.priority = props.priority;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(feature: Feature): FeatureEntity {
    return new FeatureEntity({
      id: feature.id,
      organizationId: feature.organizationId,
      projectId: feature.projectId,
      moduleId: feature.moduleId,
      ownerId: feature.ownerId,
      name: feature.name,
      code: feature.code,
      description: feature.description,
      status: feature.status as FeatureStatus,
      priority: feature.priority as FeaturePriority,
      startDate: feature.startDate,
      endDate: feature.endDate,
      isActive: feature.isActive,
      createdAt: feature.createdAt,
    });
  }
}
