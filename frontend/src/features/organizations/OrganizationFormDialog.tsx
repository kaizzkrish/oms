import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { OrganizationRecord } from './organizationsApi';

const optionalUrl = z.string().url('Enter a valid URL').optional().or(z.literal(''));
const optionalEmail = z.string().email('Enter a valid email address').optional().or(z.literal(''));

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  legalName: z.string().max(150),
  registrationNumber: z.string().max(100),
  industry: z.string().max(100),
  website: optionalUrl,
  email: optionalEmail,
  phone: z.string().max(30),
  logoUrl: optionalUrl,
  isActive: z.boolean(),
});

export type OrganizationFormValues = z.infer<typeof schema>;

interface OrganizationFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  organization?: OrganizationRecord;
  submitting?: boolean;
  onSubmit: (values: OrganizationFormValues) => void;
  onClose: () => void;
}

export function OrganizationFormDialog({
  open,
  mode,
  organization,
  submitting = false,
  onSubmit,
  onClose,
}: OrganizationFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      legalName: '',
      registrationNumber: '',
      industry: '',
      website: '',
      email: '',
      phone: '',
      logoUrl: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: organization?.name ?? '',
        legalName: organization?.legalName ?? '',
        registrationNumber: organization?.registrationNumber ?? '',
        industry: organization?.industry ?? '',
        website: organization?.website ?? '',
        email: organization?.email ?? '',
        phone: organization?.phone ?? '',
        logoUrl: organization?.logoUrl ?? '',
        isActive: organization?.isActive ?? true,
      });
    }
  }, [open, organization, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Organization' : 'Edit Organization'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="organization-form"
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <Stack spacing={2}>
            <TextField
              label="Name"
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              {...register('name')}
            />
            <TextField
              label="Legal name"
              error={Boolean(errors.legalName)}
              helperText={errors.legalName?.message}
              {...register('legalName')}
            />
            <TextField
              label="Registration number"
              error={Boolean(errors.registrationNumber)}
              helperText={errors.registrationNumber?.message}
              {...register('registrationNumber')}
            />
            <TextField
              label="Industry"
              error={Boolean(errors.industry)}
              helperText={errors.industry?.message}
              {...register('industry')}
            />
            <TextField
              label="Website"
              placeholder="https://example.com"
              error={Boolean(errors.website)}
              helperText={errors.website?.message}
              {...register('website')}
            />
            <TextField
              label="Email"
              type="email"
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              {...register('email')}
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
        <Button type="submit" form="organization-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
