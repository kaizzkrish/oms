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
import { useListDepartmentsQuery } from '../departments/departmentsApi';
import { useListEmployeesQuery } from '../employees/employeesApi';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import type { TeamRecord } from './teamsApi';

const schema = z.object({
  organizationId: z.string().min(1, 'Select an organization'),
  departmentId: z.string(),
  teamLeaderId: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  code: z.string().max(20),
  description: z.string().max(500),
  isActive: z.boolean(),
});

export type TeamFormValues = z.infer<typeof schema>;

interface TeamFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  team?: TeamRecord;
  defaultOrganizationId?: string;
  submitting?: boolean;
  onSubmit: (values: TeamFormValues) => void;
  onClose: () => void;
}

export function TeamFormDialog({
  open,
  mode,
  team,
  defaultOrganizationId,
  submitting = false,
  onSubmit,
  onClose,
}: TeamFormDialogProps) {
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
  } = useForm<TeamFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: '',
      departmentId: '',
      teamLeaderId: '',
      name: '',
      code: '',
      description: '',
      isActive: true,
    },
  });

  const selectedOrganizationId = useWatch({ control, name: 'organizationId' });

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

  useEffect(() => {
    if (open) {
      reset({
        organizationId: team?.organizationId ?? defaultOrganizationId ?? '',
        departmentId: team?.departmentId ?? '',
        teamLeaderId: team?.teamLeaderId ?? '',
        name: team?.name ?? '',
        code: team?.code ?? '',
        description: team?.description ?? '',
        isActive: team?.isActive ?? true,
      });
    }
  }, [open, team, defaultOrganizationId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Team' : 'Edit Team'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="team-form"
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
              name="departmentId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Department"
                  disabled={!selectedOrganizationId}
                  helperText="Optional — leave blank for an organization-wide team"
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
              name="teamLeaderId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Team Leader"
                  disabled={!selectedOrganizationId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No team leader</em>
                  </MenuItem>
                  {(employeesData?.items ?? []).map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.user.firstName} {employee.user.lastName} ({employee.employeeCode})
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
              placeholder="ENG-TEAM"
              error={Boolean(errors.code)}
              helperText={errors.code?.message}
              {...register('code')}
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
        <Button type="submit" form="team-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
