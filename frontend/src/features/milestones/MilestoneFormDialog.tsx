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
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import { useListProjectsQuery } from '../projects/projectsApi';
import { MILESTONE_STATUSES, type MilestoneRecord } from './milestonesApi';

const STATUS_LABELS: Record<(typeof MILESTONE_STATUSES)[number], string> = {
  PENDING: 'Pending',
  AT_RISK: 'At Risk',
  ACHIEVED: 'Achieved',
  MISSED: 'Missed',
  CANCELLED: 'Cancelled',
};

const schema = z.object({
  organizationId: z.string().min(1, 'Select an organization'),
  projectId: z.string().min(1, 'Select a project'),
  ownerId: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  code: z.string().max(20),
  description: z.string().max(500),
  status: z.enum(MILESTONE_STATUSES),
  dueDate: z.string().min(1, 'Due date is required'),
  achievedDate: z.string(),
  isActive: z.boolean(),
});

export type MilestoneFormValues = z.infer<typeof schema>;

interface MilestoneFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  milestone?: MilestoneRecord;
  defaultOrganizationId?: string;
  defaultProjectId?: string;
  submitting?: boolean;
  onSubmit: (values: MilestoneFormValues) => void;
  onClose: () => void;
}

export function MilestoneFormDialog({
  open,
  mode,
  milestone,
  defaultOrganizationId,
  defaultProjectId,
  submitting = false,
  onSubmit,
  onClose,
}: MilestoneFormDialogProps) {
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
  } = useForm<MilestoneFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: '',
      projectId: '',
      ownerId: '',
      name: '',
      code: '',
      description: '',
      status: 'PENDING',
      dueDate: '',
      achievedDate: '',
      isActive: true,
    },
  });

  const selectedOrganizationId = useWatch({ control, name: 'organizationId' });

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
        organizationId: milestone?.organizationId ?? defaultOrganizationId ?? '',
        projectId: milestone?.projectId ?? defaultProjectId ?? '',
        ownerId: milestone?.ownerId ?? '',
        name: milestone?.name ?? '',
        code: milestone?.code ?? '',
        description: milestone?.description ?? '',
        status: milestone?.status ?? 'PENDING',
        dueDate: milestone?.dueDate ? milestone.dueDate.slice(0, 10) : '',
        achievedDate: milestone?.achievedDate ? milestone.achievedDate.slice(0, 10) : '',
        isActive: milestone?.isActive ?? true,
      });
    }
  }, [open, milestone, defaultOrganizationId, defaultProjectId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Milestone' : 'Edit Milestone'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="milestone-form"
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
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              {...register('name')}
            />
            <TextField
              label="Code"
              placeholder="BETA"
              error={Boolean(errors.code)}
              helperText={errors.code?.message}
              {...register('code')}
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
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Status">
                  {MILESTONE_STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Due Date"
                type="date"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.dueDate)}
                helperText={errors.dueDate?.message}
                {...register('dueDate')}
              />
              <TextField
                label="Achieved Date"
                type="date"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Optional"
                {...register('achievedDate')}
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
        <Button type="submit" form="milestone-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
