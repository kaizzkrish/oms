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
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useListDepartmentsQuery } from '../departments/departmentsApi';
import { useListDesignationsQuery } from '../designations/designationsApi';
import { useListOfficesQuery } from '../offices/officesApi';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import { useListUsersQuery } from '../users/usersApi';
import { useListEmployeesQuery, type EmployeeRecord } from './employeesApi';

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'] as const;

const EMPLOYMENT_TYPE_LABELS: Record<(typeof EMPLOYMENT_TYPES)[number], string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
};

const schema = z.object({
  userId: z.string().min(1, 'Select a user'),
  organizationId: z.string().min(1, 'Select an organization'),
  departmentId: z.string(),
  designationId: z.string(),
  officeId: z.string(),
  reportingManagerId: z.string(),
  employeeCode: z.string().min(2, 'Code must be at least 2 characters').max(30),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  dateOfJoining: z.string().min(1, 'Date of joining is required'),
  dateOfLeaving: z.string(),
  phone: z.string().max(20),
  isActive: z.boolean(),
});

export type EmployeeFormValues = z.infer<typeof schema>;

interface EmployeeFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  employee?: EmployeeRecord;
  defaultOrganizationId?: string;
  submitting?: boolean;
  onSubmit: (values: EmployeeFormValues) => void;
  onClose: () => void;
}

export function EmployeeFormDialog({
  open,
  mode,
  employee,
  defaultOrganizationId,
  submitting = false,
  onSubmit,
  onClose,
}: EmployeeFormDialogProps) {
  const { data: organizationsData } = useListOrganizationsQuery(
    { page: 1, limit: 100, isActive: true, sortBy: 'name', sortOrder: 'asc' },
    { skip: !open },
  );

  const { data: usersData } = useListUsersQuery(
    { page: 1, limit: 100, isActive: true, sortBy: 'firstName', sortOrder: 'asc' },
    { skip: !open || mode !== 'create' },
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: '',
      organizationId: '',
      departmentId: '',
      designationId: '',
      officeId: '',
      reportingManagerId: '',
      employeeCode: '',
      employmentType: 'FULL_TIME',
      dateOfJoining: '',
      dateOfLeaving: '',
      phone: '',
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

  const { data: designationsData } = useListDesignationsQuery(
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

  const { data: officesData } = useListOfficesQuery(
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

  const { data: managersData } = useListEmployeesQuery(
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
  const managerOptions = (managersData?.items ?? []).filter(
    (candidate) => candidate.id !== employee?.id,
  );

  useEffect(() => {
    if (open) {
      reset({
        userId: employee?.user.id ?? '',
        organizationId: employee?.organizationId ?? defaultOrganizationId ?? '',
        departmentId: employee?.departmentId ?? '',
        designationId: employee?.designationId ?? '',
        officeId: employee?.officeId ?? '',
        reportingManagerId: employee?.reportingManagerId ?? '',
        employeeCode: employee?.employeeCode ?? '',
        employmentType: employee?.employmentType ?? 'FULL_TIME',
        dateOfJoining: employee?.dateOfJoining ? employee.dateOfJoining.slice(0, 10) : '',
        dateOfLeaving: employee?.dateOfLeaving ? employee.dateOfLeaving.slice(0, 10) : '',
        phone: employee?.phone ?? '',
        isActive: employee?.isActive ?? true,
      });
    }
  }, [open, employee, defaultOrganizationId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Employee' : 'Edit Employee'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="employee-form"
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <Stack spacing={2}>
            {mode === 'create' ? (
              <Controller
                name="userId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="User"
                    error={Boolean(errors.userId)}
                    helperText={errors.userId?.message}
                  >
                    {(usersData?.items ?? []).map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  User
                </Typography>
                <Typography variant="body1">
                  {employee?.user.firstName} {employee?.user.lastName} ({employee?.user.email})
                </Typography>
              </Box>
            )}
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
                  helperText="Optional — leave blank for an organization-wide role"
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
              name="designationId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Designation"
                  disabled={!selectedOrganizationId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No specific designation</em>
                  </MenuItem>
                  {(designationsData?.items ?? []).map((designation) => (
                    <MenuItem key={designation.id} value={designation.id}>
                      {designation.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="officeId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Office"
                  disabled={!selectedOrganizationId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No specific office</em>
                  </MenuItem>
                  {(officesData?.items ?? []).map((office) => (
                    <MenuItem key={office.id} value={office.id}>
                      {office.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="reportingManagerId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Reporting Manager"
                  disabled={!selectedOrganizationId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No reporting manager</em>
                  </MenuItem>
                  {managerOptions.map((manager) => (
                    <MenuItem key={manager.id} value={manager.id}>
                      {manager.user.firstName} {manager.user.lastName} ({manager.employeeCode})
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Employee Code"
              placeholder="EMP-0001"
              error={Boolean(errors.employeeCode)}
              helperText={errors.employeeCode?.message}
              {...register('employeeCode')}
            />
            <Controller
              name="employmentType"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Employment Type">
                  {EMPLOYMENT_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {EMPLOYMENT_TYPE_LABELS[type]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Date of Joining"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              error={Boolean(errors.dateOfJoining)}
              helperText={errors.dateOfJoining?.message}
              {...register('dateOfJoining')}
            />
            <TextField
              label="Date of Leaving"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="Optional"
              {...register('dateOfLeaving')}
            />
            <TextField
              label="Phone"
              error={Boolean(errors.phone)}
              helperText={errors.phone?.message}
              {...register('phone')}
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
        <Button type="submit" form="employee-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
