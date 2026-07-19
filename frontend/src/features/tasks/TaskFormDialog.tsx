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
import { useListFeaturesQuery } from '../features/featuresApi';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import { useListProjectModulesQuery } from '../project-modules/projectModulesApi';
import { useListProjectsQuery } from '../projects/projectsApi';
import { useListSprintsQuery } from '../sprints/sprintsApi';
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES, type TaskRecord } from './tasksApi';

const TYPE_LABELS: Record<(typeof TASK_TYPES)[number], string> = {
  TASK: 'Task',
  BUG: 'Bug',
  STORY: 'Story',
  SUBTASK: 'Subtask',
};

const STATUS_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  BLOCKED: 'Blocked',
  CANCELLED: 'Cancelled',
};

const PRIORITY_LABELS: Record<(typeof TASK_PRIORITIES)[number], string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const schema = z.object({
  organizationId: z.string().min(1, 'Select an organization'),
  projectId: z.string().min(1, 'Select a project'),
  moduleId: z.string(),
  featureId: z.string(),
  sprintId: z.string(),
  assigneeId: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  code: z.string().max(20),
  description: z.string().max(500),
  type: z.enum(TASK_TYPES),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z.string(),
  estimatedHours: z
    .string()
    .refine((value) => value === '' || !Number.isNaN(Number(value)), 'Enter a valid number'),
  actualHours: z
    .string()
    .refine((value) => value === '' || !Number.isNaN(Number(value)), 'Enter a valid number'),
  isActive: z.boolean(),
});

export type TaskFormValues = z.infer<typeof schema>;

interface TaskFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  task?: TaskRecord;
  defaultOrganizationId?: string;
  defaultProjectId?: string;
  submitting?: boolean;
  onSubmit: (values: TaskFormValues) => void;
  onClose: () => void;
}

export function TaskFormDialog({
  open,
  mode,
  task,
  defaultOrganizationId,
  defaultProjectId,
  submitting = false,
  onSubmit,
  onClose,
}: TaskFormDialogProps) {
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
  } = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: '',
      projectId: '',
      moduleId: '',
      featureId: '',
      sprintId: '',
      assigneeId: '',
      name: '',
      code: '',
      description: '',
      type: 'TASK',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: '',
      estimatedHours: '',
      actualHours: '',
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

  const { data: featuresData } = useListFeaturesQuery(
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

  const { data: sprintsData } = useListSprintsQuery(
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
        organizationId: task?.organizationId ?? defaultOrganizationId ?? '',
        projectId: task?.projectId ?? defaultProjectId ?? '',
        moduleId: task?.moduleId ?? '',
        featureId: task?.featureId ?? '',
        sprintId: task?.sprintId ?? '',
        assigneeId: task?.assigneeId ?? '',
        name: task?.name ?? '',
        code: task?.code ?? '',
        description: task?.description ?? '',
        type: task?.type ?? 'TASK',
        status: task?.status ?? 'TODO',
        priority: task?.priority ?? 'MEDIUM',
        dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '',
        estimatedHours: task?.estimatedHours != null ? String(task.estimatedHours) : '',
        actualHours: task?.actualHours != null ? String(task.actualHours) : '',
        isActive: task?.isActive ?? true,
      });
    }
  }, [open, task, defaultOrganizationId, defaultProjectId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Task' : 'Edit Task'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="task-form"
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
              placeholder="HERO-1"
              error={Boolean(errors.code)}
              helperText={errors.code?.message}
              {...register('code')}
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
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No module</em>
                  </MenuItem>
                  {(modulesData?.items ?? []).map((projectModule) => (
                    <MenuItem key={projectModule.id} value={projectModule.id}>
                      {projectModule.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="featureId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Feature"
                  disabled={!selectedProjectId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No feature</em>
                  </MenuItem>
                  {(featuresData?.items ?? []).map((feature) => (
                    <MenuItem key={feature.id} value={feature.id}>
                      {feature.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="sprintId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Sprint"
                  disabled={!selectedProjectId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No sprint</em>
                  </MenuItem>
                  {(sprintsData?.items ?? []).map((sprint) => (
                    <MenuItem key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="assigneeId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Assignee"
                  disabled={!selectedOrganizationId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No assignee</em>
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
                    {TASK_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {TYPE_LABELS[type]}
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
                    {TASK_PRIORITIES.map((priority) => (
                      <MenuItem key={priority} value={priority}>
                        {PRIORITY_LABELS[priority]}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Stack>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Status">
                  {TASK_STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Due Date"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="Optional"
              {...register('dueDate')}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Estimated Hours"
                type="number"
                fullWidth
                error={Boolean(errors.estimatedHours)}
                helperText={errors.estimatedHours?.message ?? 'Optional'}
                {...register('estimatedHours')}
              />
              <TextField
                label="Actual Hours"
                type="number"
                fullWidth
                error={Boolean(errors.actualHours)}
                helperText={errors.actualHours?.message ?? 'Optional'}
                {...register('actualHours')}
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
        <Button type="submit" form="task-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
