import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useListEmployeesQuery } from '../employees/employeesApi';
import { useListMilestonesQuery } from '../milestones/milestonesApi';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import { useListProjectsQuery } from '../projects/projectsApi';
import { DELIVERABLE_STATUSES, DELIVERABLE_TYPES, type DeliverableRecord } from './deliverablesApi';

const TYPE_LABELS: Record<(typeof DELIVERABLE_TYPES)[number], string> = {
  DOCUMENT: 'Document',
  SOFTWARE: 'Software',
  DESIGN: 'Design',
  REPORT: 'Report',
  OTHER: 'Other',
};

const STATUS_LABELS: Record<(typeof DELIVERABLE_STATUSES)[number], string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

const schema = z.object({
  organizationId: z.string().min(1, 'Select an organization'),
  projectId: z.string().min(1, 'Select a project'),
  milestoneId: z.string(),
  ownerId: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  code: z.string().max(20),
  description: z.string().max(1000),
  type: z.enum(DELIVERABLE_TYPES),
  status: z.enum(DELIVERABLE_STATUSES),
  dueDate: z.string(),
  submittedDate: z.string(),
  isActive: z.boolean(),
});

export type DeliverableFormValues = z.infer<typeof schema>;

interface DeliverableFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  deliverable?: DeliverableRecord;
  defaultOrganizationId?: string;
  defaultProjectId?: string;
  submitting?: boolean;
  onSubmit: (values: DeliverableFormValues) => void;
  onClose: () => void;
}

export function DeliverableFormDialog({
  open,
  mode,
  deliverable,
  defaultOrganizationId,
  defaultProjectId,
  submitting = false,
  onSubmit,
  onClose,
}: DeliverableFormDialogProps) {
  const { data: organizationsData } = useListOrganizationsQuery(
    { page: 1, limit: 100, isActive: true, sortBy: 'name', sortOrder: 'asc' },
    { skip: !open },
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<DeliverableFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: '',
      projectId: '',
      milestoneId: '',
      ownerId: '',
      name: '',
      code: '',
      description: '',
      type: 'DOCUMENT',
      status: 'PENDING',
      dueDate: '',
      submittedDate: '',
      isActive: true,
    },
  });

  const selectedOrganizationId = useWatch({ control, name: 'organizationId' });
  const selectedProjectId = useWatch({ control, name: 'projectId' });

  const { data: projectsData } = useListProjectsQuery(
    {
      page: 1,
      limit: 100,
      isActive: true,
      organizationId: selectedOrganizationId || undefined,
      sortBy: 'name',
      sortOrder: 'asc',
    },
    { skip: !open || !selectedOrganizationId },
  );

  const { data: milestonesData } = useListMilestonesQuery(
    {
      page: 1,
      limit: 100,
      isActive: true,
      projectId: selectedProjectId || undefined,
      sortBy: 'name',
      sortOrder: 'asc',
    },
    { skip: !open || !selectedProjectId },
  );

  const { data: employeesData } = useListEmployeesQuery(
    {
      page: 1,
      limit: 100,
      isActive: true,
      organizationId: selectedOrganizationId || undefined,
      sortBy: 'employeeCode',
      sortOrder: 'asc',
    },
    { skip: !open || !selectedOrganizationId },
  );

  useEffect(() => {
    if (open) {
      reset({
        organizationId: deliverable?.organizationId ?? defaultOrganizationId ?? '',
        projectId: deliverable?.projectId ?? defaultProjectId ?? '',
        milestoneId: deliverable?.milestoneId ?? '',
        ownerId: deliverable?.ownerId ?? '',
        name: deliverable?.name ?? '',
        code: deliverable?.code ?? '',
        description: deliverable?.description ?? '',
        type: deliverable?.type ?? 'DOCUMENT',
        status: deliverable?.status ?? 'PENDING',
        dueDate: deliverable?.dueDate ? deliverable.dueDate.slice(0, 10) : '',
        submittedDate: deliverable?.submittedDate ? deliverable.submittedDate.slice(0, 10) : '',
        isActive: deliverable?.isActive ?? true,
      });
    }
  }, [open, deliverable, defaultOrganizationId, defaultProjectId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Deliverable' : 'Edit Deliverable'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="deliverable-form"
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <Stack spacing={2}>
            <Controller
              name="organizationId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Organization"
                  error={Boolean(errors.organizationId)}
                  helperText={errors.organizationId?.message}
                >
                  {(organizationsData?.items ?? []).map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="projectId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Project"
                  disabled={!selectedOrganizationId}
                  error={Boolean(errors.projectId)}
                  helperText={errors.projectId?.message}
                >
                  {(projectsData?.items ?? []).map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Name"
              placeholder="Beta Launch Readiness Report"
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              {...register('name')}
            />
            <TextField
              label="Code"
              placeholder="BETA-RPT"
              error={Boolean(errors.code)}
              helperText={errors.code?.message}
              {...register('code')}
            />
            <Controller
              name="milestoneId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Milestone"
                  disabled={!selectedProjectId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No milestone</em>
                  </MenuItem>
                  {(milestonesData?.items ?? []).map((milestone) => (
                    <MenuItem key={milestone.id} value={milestone.id}>
                      {milestone.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="ownerId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Owner"
                  disabled={!selectedOrganizationId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No owner</em>
                  </MenuItem>
                  {(employeesData?.items ?? []).map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.user.firstName} {employee.user.lastName} ({employee.employeeCode})
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Stack direction="row" spacing={2}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Type" fullWidth>
                    {DELIVERABLE_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Status" fullWidth>
                    {DELIVERABLE_STATUSES.map((status) => (
                      <MenuItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Due Date"
                type="date"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Optional"
                {...register('dueDate')}
              />
              <TextField
                label="Submitted Date"
                type="date"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Optional"
                {...register('submittedDate')}
              />
            </Stack>
            <TextField
              label="Description"
              multiline
              minRows={2}
              error={Boolean(errors.description)}
              helperText={errors.description?.message}
              {...register('description')}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  }
                  label="Active"
                />
              )}
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" form="deliverable-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
