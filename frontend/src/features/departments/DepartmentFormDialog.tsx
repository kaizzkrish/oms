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
import { useListOfficesQuery } from '../offices/officesApi';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import type { DepartmentRecord } from './departmentsApi';

const schema = z.object({
  organizationId: z.string().min(1, 'Select an organization'),
  officeId: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  code: z.string().max(20),
  description: z.string().max(500),
  isActive: z.boolean(),
});

export type DepartmentFormValues = z.infer<typeof schema>;

interface DepartmentFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  department?: DepartmentRecord;
  defaultOrganizationId?: string;
  submitting?: boolean;
  onSubmit: (values: DepartmentFormValues) => void;
  onClose: () => void;
}

export function DepartmentFormDialog({
  open,
  mode,
  department,
  defaultOrganizationId,
  submitting = false,
  onSubmit,
  onClose,
}: DepartmentFormDialogProps) {
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
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: '',
      officeId: '',
      name: '',
      code: '',
      description: '',
      isActive: true,
    },
  });

  const selectedOrganizationId = useWatch({ control, name: 'organizationId' });

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

  useEffect(() => {
    if (open) {
      reset({
        organizationId: department?.organizationId ?? defaultOrganizationId ?? '',
        officeId: department?.officeId ?? '',
        name: department?.name ?? '',
        code: department?.code ?? '',
        description: department?.description ?? '',
        isActive: department?.isActive ?? true,
      });
    }
  }, [open, department, defaultOrganizationId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Department' : 'Edit Department'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="department-form"
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
              name="officeId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Office"
                  disabled={!selectedOrganizationId}
                  helperText="Optional — leave blank for an organization-wide department"
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
            <TextField
              label="Name"
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              {...register('name')}
            />
            <TextField
              label="Code"
              placeholder="ENG"
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
        <Button type="submit" form="department-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
