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
import { useListClientsQuery } from '../clients/clientsApi';
import { useListDepartmentsQuery } from '../departments/departmentsApi';
import { useListEmployeesQuery } from '../employees/employeesApi';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import { useListTeamsQuery } from '../teams/teamsApi';
import { PROJECT_PRIORITIES, PROJECT_STATUSES, type ProjectRecord } from './projectsApi';

const STATUS_LABELS: Record<(typeof PROJECT_STATUSES)[number], string> = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const PRIORITY_LABELS: Record<(typeof PROJECT_PRIORITIES)[number], string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const schema = z
  .object({
    organizationId: z.string().min(1, 'Select an organization'),
    clientId: z.string(),
    departmentId: z.string(),
    projectManagerId: z.string(),
    teamId: z.string(),
    name: z.string().min(2, 'Name must be at least 2 characters').max(150),
    code: z.string().max(20),
    description: z.string().max(500),
    status: z.enum(PROJECT_STATUSES),
    priority: z.enum(PROJECT_PRIORITIES),
    startDate: z.string(),
    endDate: z.string(),
    budget: z
      .string()
      .refine((value) => value === '' || !Number.isNaN(Number(value)), 'Enter a valid number'),
    isActive: z.boolean(),
  })
  .refine((values) => !values.startDate || !values.endDate || values.endDate >= values.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

export type ProjectFormValues = z.infer<typeof schema>;

interface ProjectFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  project?: ProjectRecord;
  defaultOrganizationId?: string;
  submitting?: boolean;
  onSubmit: (values: ProjectFormValues) => void;
  onClose: () => void;
}

export function ProjectFormDialog({
  open,
  mode,
  project,
  defaultOrganizationId,
  submitting = false,
  onSubmit,
  onClose,
}: ProjectFormDialogProps) {
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
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: '',
      clientId: '',
      departmentId: '',
      projectManagerId: '',
      teamId: '',
      name: '',
      code: '',
      description: '',
      status: 'PLANNING',
      priority: 'MEDIUM',
      startDate: '',
      endDate: '',
      budget: '',
      isActive: true,
    },
  });

  const selectedOrganizationId = useWatch({ control, name: 'organizationId' });

  const { data: clientsData } = useListClientsQuery(
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

  const { data: departmentsData } = useListDepartmentsQuery(
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

  const { data: teamsData } = useListTeamsQuery(
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

  useEffect(() => {
    if (open) {
      reset({
        organizationId: project?.organizationId ?? defaultOrganizationId ?? '',
        clientId: project?.clientId ?? '',
        departmentId: project?.departmentId ?? '',
        projectManagerId: project?.projectManagerId ?? '',
        teamId: project?.teamId ?? '',
        name: project?.name ?? '',
        code: project?.code ?? '',
        description: project?.description ?? '',
        status: project?.status ?? 'PLANNING',
        priority: project?.priority ?? 'MEDIUM',
        startDate: project?.startDate ? project.startDate.slice(0, 10) : '',
        endDate: project?.endDate ? project.endDate.slice(0, 10) : '',
        budget: project?.budget != null ? String(project.budget) : '',
        isActive: project?.isActive ?? true,
      });
    }
  }, [open, project, defaultOrganizationId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Project' : 'Edit Project'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="project-form"
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
            <TextField
              label="Name"
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              {...register('name')}
            />
            <TextField
              label="Code"
              placeholder="WEB-RD"
              error={Boolean(errors.code)}
              helperText={errors.code?.message}
              {...register('code')}
            />
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Client"
                  disabled={!selectedOrganizationId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No client</em>
                  </MenuItem>
                  {(clientsData?.items ?? []).map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="departmentId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Department"
                  disabled={!selectedOrganizationId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No specific department</em>
                  </MenuItem>
                  {(departmentsData?.items ?? []).map((department) => (
                    <MenuItem key={department.id} value={department.id}>
                      {department.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="projectManagerId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Project Manager"
                  disabled={!selectedOrganizationId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No project manager</em>
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
              name="teamId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Team"
                  disabled={!selectedOrganizationId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No team</em>
                  </MenuItem>
                  {(teamsData?.items ?? []).map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Stack direction="row" spacing={2}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Status" fullWidth>
                    {PROJECT_STATUSES.map((status) => (
                      <MenuItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Priority" fullWidth>
                    {PROJECT_PRIORITIES.map((priority) => (
                      <MenuItem key={priority} value={priority}>
                        {PRIORITY_LABELS[priority]}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Optional"
                {...register('startDate')}
              />
              <TextField
                label="End Date"
                type="date"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.endDate)}
                helperText={errors.endDate?.message ?? 'Optional'}
                {...register('endDate')}
              />
            </Stack>
            <TextField
              label="Budget"
              type="number"
              error={Boolean(errors.budget)}
              helperText={errors.budget?.message ?? 'Optional'}
              {...register('budget')}
            />
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
        <Button type="submit" form="project-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
