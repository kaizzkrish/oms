import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import { REPORT_TYPES } from './reportsApi';

const TYPE_LABELS: Record<(typeof REPORT_TYPES)[number], string> = {
  PROJECTS: 'Projects',
  TASKS: 'Tasks',
  DELIVERABLES: 'Deliverables',
  EMPLOYEES: 'Employees',
};

const schema = z.object({
  organizationId: z.string().min(1, 'Select an organization'),
  type: z.enum(REPORT_TYPES),
  name: z.string().max(150),
});

export type GenerateReportFormValues = z.infer<typeof schema>;

interface GenerateReportDialogProps {
  open: boolean;
  defaultOrganizationId?: string;
  submitting?: boolean;
  onSubmit: (values: GenerateReportFormValues) => void;
  onClose: () => void;
}

export function GenerateReportDialog({
  open,
  defaultOrganizationId,
  submitting = false,
  onSubmit,
  onClose,
}: GenerateReportDialogProps) {
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
  } = useForm<GenerateReportFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: '',
      type: 'PROJECTS',
      name: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        organizationId: defaultOrganizationId ?? '',
        type: 'PROJECTS',
        name: '',
      });
    }
  }, [open, defaultOrganizationId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Report</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="generate-report-form"
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
              name="type"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Report Type">
                  {REPORT_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Name"
              placeholder='Defaults to "<Type> Report - <date>"'
              error={Boolean(errors.name)}
              helperText={errors.name?.message ?? 'Optional'}
              {...register('name')}
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" form="generate-report-form" variant="contained" disabled={submitting}>
          Generate
        </Button>
      </DialogActions>
    </Dialog>
  );
}
