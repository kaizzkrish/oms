import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import { useState } from 'react';
import { useGetDashboardSummaryQuery } from './dashboardApi';
import type { DeliverableStatus } from '../deliverables/deliverablesApi';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import type { ProjectStatus } from '../projects/projectsApi';
import type { TaskStatus } from '../tasks/tasksApi';

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  BLOCKED: 'Blocked',
  CANCELLED: 'Cancelled',
};

const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface StatCardProps {
  icon: SvgIconComponent;
  label: string;
  value: string;
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Icon sx={{ fontSize: 36, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

interface StatusBreakdownProps {
  title: string;
  total: number;
  rows: { label: string; count: number }[];
}

function StatusBreakdown({ title, total, rows }: StatusBreakdownProps) {
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        {title}
      </Typography>
      <Stack spacing={1.5}>
        {rows.map((row) => (
          <Box key={row.label}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">{row.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {row.count}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={total > 0 ? (row.count / total) * 100 : 0}
            />
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

export function DashboardPage() {
  const [organizationFilter, setOrganizationFilter] = useState('');

  const { data: organizationsData } = useListOrganizationsQuery({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const {
    data: summary,
    isLoading,
    error,
  } = useGetDashboardSummaryQuery({
    organizationId: organizationFilter || undefined,
  });

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <TextField
          select
          label="Organization"
          size="small"
          value={organizationFilter}
          onChange={(event) => setOrganizationFilter(event.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">All organizations</MenuItem>
          {(organizationsData?.items ?? []).map((org) => (
            <MenuItem key={org.id} value={org.id}>
              {org.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error ? <Alert severity="error">Failed to load the dashboard summary.</Alert> : null}

      {isLoading || !summary ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <Skeleton variant="rounded" height={92} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <StatCard
                icon={ApartmentOutlinedIcon}
                label="Organizations"
                value={String(summary.organizations)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <StatCard
                icon={PeopleAltOutlinedIcon}
                label="Employees"
                value={String(summary.employees)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <StatCard
                icon={AssignmentOutlinedIcon}
                label="Projects"
                value={String(summary.projects.total)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <StatCard
                icon={ChecklistOutlinedIcon}
                label="Tasks"
                value={String(summary.tasks.total)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <StatCard
                icon={AssignmentTurnedInOutlinedIcon}
                label="Deliverables"
                value={String(summary.deliverables.total)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <StatCard
                icon={DescriptionOutlinedIcon}
                label="Documents"
                value={`${summary.documents.total} (${formatBytes(summary.documents.totalSizeBytes)})`}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatusBreakdown
                title="Projects by Status"
                total={summary.projects.total}
                rows={Object.entries(summary.projects.byStatus).map(([status, count]) => ({
                  label: PROJECT_STATUS_LABELS[status as ProjectStatus],
                  count,
                }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatusBreakdown
                title="Tasks by Status"
                total={summary.tasks.total}
                rows={Object.entries(summary.tasks.byStatus).map(([status, count]) => ({
                  label: TASK_STATUS_LABELS[status as TaskStatus],
                  count,
                }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatusBreakdown
                title="Deliverables by Status"
                total={summary.deliverables.total}
                rows={Object.entries(summary.deliverables.byStatus).map(([status, count]) => ({
                  label: DELIVERABLE_STATUS_LABELS[status as DeliverableStatus],
                  count,
                }))}
              />
            </Grid>
          </Grid>
        </>
      )}
    </Stack>
  );
}
