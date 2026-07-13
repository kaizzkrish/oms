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
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import type { DesignationRecord } from './designationsApi';

const schema = z.object({
  organizationId: z.string().min(1, 'Select an organization'),
  departmentId: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  code: z.string().max(20),
  description: z.string().max(500),
  isActive: z.boolean(),
});

export type DesignationFormValues = z.infer<typeof schema>;

interface DesignationFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  designation?: DesignationRecord;
  defaultOrganizationId?: string;
  submitting?: boolean;
  onSubmit: (values: DesignationFormValues) => void;
  onClose: () => void;
}

export function DesignationFormDialog({
  open,
  mode,
  designation,
  defaultOrganizationId,
  submitting = false,
  onSubmit,
  onClose,
}: DesignationFormDialogProps) {
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
  } = useForm<DesignationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: '',
      departmentId: '',
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

  useEffect(() => {
    if (open) {
      reset({
        organizationId: designation?.organizationId ?? defaultOrganizationId ?? '',
        departmentId: designation?.departmentId ?? '',
        name: designation?.name ?? '',
        code: designation?.code ?? '',
        description: designation?.description ?? '',
        isActive: designation?.isActive ?? true,
      });
    }
  }, [open, designation, defaultOrganizationId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Designation' : 'Edit Designation'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="designation-form"
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
                  helperText="Optional — leave blank for an organization-wide designation"
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
            <TextField
              label="Name"
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              {...register('name')}
            />
            <TextField
              label="Code"
              placeholder="SE"
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
        <Button type="submit" form="designation-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
