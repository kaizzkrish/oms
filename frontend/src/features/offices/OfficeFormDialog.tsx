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
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import type { OfficeRecord } from './officesApi';

const optionalEmail = z.string().email('Enter a valid email address').optional().or(z.literal(''));

const schema = z.object({
  organizationId: z.string().min(1, 'Select an organization'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  isHeadquarters: z.boolean(),
  addressLine1: z.string().min(1, 'Address is required').max(200),
  addressLine2: z.string().max(200),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().max(100),
  country: z.string().min(1, 'Country is required').max(100),
  postalCode: z.string().max(20),
  phone: z.string().max(30),
  email: optionalEmail,
  isActive: z.boolean(),
});

export type OfficeFormValues = z.infer<typeof schema>;

interface OfficeFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  office?: OfficeRecord;
  defaultOrganizationId?: string;
  submitting?: boolean;
  onSubmit: (values: OfficeFormValues) => void;
  onClose: () => void;
}

export function OfficeFormDialog({
  open,
  mode,
  office,
  defaultOrganizationId,
  submitting = false,
  onSubmit,
  onClose,
}: OfficeFormDialogProps) {
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
  } = useForm<OfficeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: '',
      name: '',
      isHeadquarters: false,
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      phone: '',
      email: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        organizationId: office?.organizationId ?? defaultOrganizationId ?? '',
        name: office?.name ?? '',
        isHeadquarters: office?.isHeadquarters ?? false,
        addressLine1: office?.addressLine1 ?? '',
        addressLine2: office?.addressLine2 ?? '',
        city: office?.city ?? '',
        state: office?.state ?? '',
        country: office?.country ?? '',
        postalCode: office?.postalCode ?? '',
        phone: office?.phone ?? '',
        email: office?.email ?? '',
        isActive: office?.isActive ?? true,
      });
    }
  }, [open, office, defaultOrganizationId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Office' : 'Edit Office'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="office-form"
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
              label="Address line 1"
              error={Boolean(errors.addressLine1)}
              helperText={errors.addressLine1?.message}
              {...register('addressLine1')}
            />
            <TextField
              label="Address line 2"
              error={Boolean(errors.addressLine2)}
              helperText={errors.addressLine2?.message}
              {...register('addressLine2')}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="City"
                fullWidth
                error={Boolean(errors.city)}
                helperText={errors.city?.message}
                {...register('city')}
              />
              <TextField
                label="State"
                fullWidth
                error={Boolean(errors.state)}
                helperText={errors.state?.message}
                {...register('state')}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Country"
                fullWidth
                error={Boolean(errors.country)}
                helperText={errors.country?.message}
                {...register('country')}
              />
              <TextField
                label="Postal code"
                fullWidth
                error={Boolean(errors.postalCode)}
                helperText={errors.postalCode?.message}
                {...register('postalCode')}
              />
            </Stack>
            <TextField
              label="Phone"
              error={Boolean(errors.phone)}
              helperText={errors.phone?.message}
              {...register('phone')}
            />
            <TextField
              label="Email"
              type="email"
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              {...register('email')}
            />
            <Controller
              name="isHeadquarters"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  }
                  label="Headquarters"
                />
              )}
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
        <Button type="submit" form="office-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
