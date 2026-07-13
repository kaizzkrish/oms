import { ApiProperty } from '@nestjs/swagger';
import type { Team } from '../../../generated/prisma/client';

export type TeamWithMemberCount = Team & { _count: { members: number } };

export class TeamEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ nullable: true })
  departmentId: string | null;

  @ApiProperty({ nullable: true })
  teamLeaderId: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  code: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  memberCount: number;

  @ApiProperty()
  createdAt: Date;

  constructor(props: TeamEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.departmentId = props.departmentId;
    this.teamLeaderId = props.teamLeaderId;
    this.name = props.name;
    this.code = props.code;
    this.description = props.description;
    this.isActive = props.isActive;
    this.memberCount = props.memberCount;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(team: TeamWithMemberCount): TeamEntity {
    return new TeamEntity({
      id: team.id,
      organizationId: team.organizationId,
      departmentId: team.departmentId,
      teamLeaderId: team.teamLeaderId,
      name: team.name,
      code: team.code,
      description: team.description,
      isActive: team.isActive,
      memberCount: team._count.members,
      createdAt: team.createdAt,
    });
  }
}
