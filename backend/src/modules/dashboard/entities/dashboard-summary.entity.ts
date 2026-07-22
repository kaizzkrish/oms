import { ApiProperty } from '@nestjs/swagger';
import type { ProjectStatus } from '../../projects/constants/project-status';
import type { TaskStatus } from '../../tasks/constants/task-status';
import type { DeliverableStatus } from '../../deliverables/constants/deliverable-status';

export class ProjectsSummaryEntity {
  @ApiProperty()
  total: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byStatus: Record<ProjectStatus, number>;

  constructor(props: ProjectsSummaryEntity) {
    this.total = props.total;
    this.byStatus = props.byStatus;
  }
}

export class TasksSummaryEntity {
  @ApiProperty()
  total: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byStatus: Record<TaskStatus, number>;

  constructor(props: TasksSummaryEntity) {
    this.total = props.total;
    this.byStatus = props.byStatus;
  }
}

export class DeliverablesSummaryEntity {
  @ApiProperty()
  total: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byStatus: Record<DeliverableStatus, number>;

  constructor(props: DeliverablesSummaryEntity) {
    this.total = props.total;
    this.byStatus = props.byStatus;
  }
}

export class DocumentsSummaryEntity {
  @ApiProperty()
  total: number;

  @ApiProperty()
  totalSizeBytes: number;

  constructor(props: DocumentsSummaryEntity) {
    this.total = props.total;
    this.totalSizeBytes = props.totalSizeBytes;
  }
}

export class DashboardSummaryEntity {
  @ApiProperty()
  organizations: number;

  @ApiProperty()
  employees: number;

  @ApiProperty({ type: ProjectsSummaryEntity })
  projects: ProjectsSummaryEntity;

  @ApiProperty({ type: TasksSummaryEntity })
  tasks: TasksSummaryEntity;

  @ApiProperty({ type: DeliverablesSummaryEntity })
  deliverables: DeliverablesSummaryEntity;

  @ApiProperty({ type: DocumentsSummaryEntity })
  documents: DocumentsSummaryEntity;

  constructor(props: DashboardSummaryEntity) {
    this.organizations = props.organizations;
    this.employees = props.employees;
    this.projects = props.projects;
    this.tasks = props.tasks;
    this.deliverables = props.deliverables;
    this.documents = props.documents;
  }
}
