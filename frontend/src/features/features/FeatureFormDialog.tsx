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
import { useListProjectModulesQuery } from '../project-modules/projectModulesApi';
import { useListProjectsQuery } from '../projects/projectsApi';
import { FEATURE_PRIORITIES, FEATURE_STATUSES, type FeatureRecord } from './featuresApi';

const STATUS_LABELS: Record<(typeof FEATURE_STATUSES)[number], string> = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const PRIORITY_LABELS: Record<(typeof FEATURE_PRIORITIES)[number], string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const schema = z
  .object({
    organizationId: z.string().min(1, 'Select an organization'),
    projectId: z.string().min(1, 'Select a project'),
    moduleId: z.string().min(1, 'Select a module'),
    ownerId: z.string(),
    name: z.string().min(2, 'Name must be at least 2 characters').max(150),
    code: z.string().max(20),
    description: z.string().max(500),
    status: z.enum(FEATURE_STATUSES),
    priority: z.enum(FEATURE_PRIORITIES),
    startDate: z.string(),
    endDate: z.string(),
    isActive: z.boolean(),
  })
  .refine((values) => !values.startDate || !values.endDate || values.endDate >= values.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

export type FeatureFormValues = z.infer<typeof schema>;

interface FeatureFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  feature?: FeatureRecord;
  defaultOrganizationId?: string;
  defaultProjectId?: string;
  defaultModuleId?: string;
  submitting?: boolean;
  onSubmit: (values: FeatureFormValues) => void;
  onClose: () => void;
}

export function FeatureFormDialog({
  open,
  mode,
  feature,
  defaultOrganizationId,
  defaultProjectId,
  defaultModuleId,
  submitting = false,
  onSubmit,
  onClose,
}: FeatureFormDialogProps) {
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
  } = useForm<FeatureFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: '',
      projectId: '',
      moduleId: '',
      ownerId: '',
      name: '',
      code: '',
      description: '',
      status: 'PLANNING',
      priority: 'MEDIUM',
      startDate: '',
      endDate: '',
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

  const { data: modulesData } = useListProjectModulesQuery(
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
        organizationId: feature?.organizationId ?? defaultOrganizationId ?? '',
        projectId: feature?.projectId ?? defaultProjectId ?? '',
        moduleId: feature?.moduleId ?? defaultModuleId ?? '',
        ownerId: feature?.ownerId ?? '',
        name: feature?.name ?? '',
        code: feature?.code ?? '',
        description: feature?.description ?? '',
        status: feature?.status ?? 'PLANNING',
        priority: feature?.priority ?? 'MEDIUM',
        startDate: feature?.startDate ? feature.startDate.slice(0, 10) : '',
        endDate: feature?.endDate ? feature.endDate.slice(0, 10) : '',
        isActive: feature?.isActive ?? true,
      });
    }
  }, [open, feature, defaultOrganizationId, defaultProjectId, defaultModuleId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Feature' : 'Edit Feature'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="feature-form"
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
            <Controller
              name="moduleId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Module"
                  disabled={!selectedProjectId}
                  error={Boolean(errors.moduleId)}
                  helperText={errors.moduleId?.message}
                >
                  {(modulesData?.items ?? []).map((projectModule) => (
                    <MenuItem key={projectModule.id} value={projectModule.id}>
                      {projectModule.name}
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
              placeholder="HERO"
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
            <Stack direction="row" spacing={2}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Status" fullWidth>
                    {FEATURE_STATUSES.map((status) => (
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
                    {FEATURE_PRIORITIES.map((priority) => (
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
        <Button type="submit" form="feature-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
