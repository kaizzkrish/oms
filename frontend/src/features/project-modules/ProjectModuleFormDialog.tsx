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
import { MODULE_STATUSES, type ProjectModuleRecord } from './projectModulesApi';

const STATUS_LABELS: Record<(typeof MODULE_STATUSES)[number], string> = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const schema = z
  .object({
    organizationId: z.string().min(1, 'Select an organization'),
    projectId: z.string().min(1, 'Select a project'),
    moduleLeadId: z.string(),
    name: z.string().min(2, 'Name must be at least 2 characters').max(150),
    code: z.string().max(20),
    description: z.string().max(500),
    status: z.enum(MODULE_STATUSES),
    startDate: z.string(),
    endDate: z.string(),
    isActive: z.boolean(),
  })
  .refine((values) => !values.startDate || !values.endDate || values.endDate >= values.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

export type ProjectModuleFormValues = z.infer<typeof schema>;

interface ProjectModuleFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  projectModule?: ProjectModuleRecord;
  defaultOrganizationId?: string;
  defaultProjectId?: string;
  submitting?: boolean;
  onSubmit: (values: ProjectModuleFormValues) => void;
  onClose: () => void;
}

export function ProjectModuleFormDialog({
  open,
  mode,
  projectModule,
  defaultOrganizationId,
  defaultProjectId,
  submitting = false,
  onSubmit,
  onClose,
}: ProjectModuleFormDialogProps) {
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
  } = useForm<ProjectModuleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: '',
      projectId: '',
      moduleLeadId: '',
      name: '',
      code: '',
      description: '',
      status: 'PLANNING',
      startDate: '',
      endDate: '',
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
        organizationId: projectModule?.organizationId ?? defaultOrganizationId ?? '',
        projectId: projectModule?.projectId ?? defaultProjectId ?? '',
        moduleLeadId: projectModule?.moduleLeadId ?? '',
        name: projectModule?.name ?? '',
        code: projectModule?.code ?? '',
        description: projectModule?.description ?? '',
        status: projectModule?.status ?? 'PLANNING',
        startDate: projectModule?.startDate ? projectModule.startDate.slice(0, 10) : '',
        endDate: projectModule?.endDate ? projectModule.endDate.slice(0, 10) : '',
        isActive: projectModule?.isActive ?? true,
      });
    }
  }, [open, projectModule, defaultOrganizationId, defaultProjectId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Module' : 'Edit Module'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="project-module-form"
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
              placeholder="HOME"
              error={Boolean(errors.code)}
              helperText={errors.code?.message}
              {...register('code')}
            />
            <Controller
              name="moduleLeadId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Module Lead"
                  disabled={!selectedOrganizationId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No module lead</em>
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
                  {MODULE_STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
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
        <Button type="submit" form="project-module-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
