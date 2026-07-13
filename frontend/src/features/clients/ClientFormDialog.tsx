import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import { useListEmployeesQuery } from '../employees/employeesApi';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import type { ClientRecord } from './clientsApi';

const optionalEmail = z.string().email('Enter a valid email address').optional().or(z.literal(''));

const schema = z.object({
  organizationId: z.string().min(1, 'Select an organization'),
  accountManagerId: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  code: z.string().max(20),
  industry: z.string().max(100),
  website: z.string().max(255),
  email: optionalEmail,
  phone: z.string().max(20),
  addressLine1: z.string().max(255),
  addressLine2: z.string().max(255),
  city: z.string().max(100),
  state: z.string().max(100),
  country: z.string().max(100),
  postalCode: z.string().max(20),
  contactName: z.string().max(150),
  contactEmail: optionalEmail,
  contactPhone: z.string().max(20),
  description: z.string().max(500),
  isActive: z.boolean(),
});

export type ClientFormValues = z.infer<typeof schema>;

interface ClientFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  client?: ClientRecord;
  defaultOrganizationId?: string;
  submitting?: boolean;
  onSubmit: (values: ClientFormValues) => void;
  onClose: () => void;
}

export function ClientFormDialog({
  open,
  mode,
  client,
  defaultOrganizationId,
  submitting = false,
  onSubmit,
  onClose,
}: ClientFormDialogProps) {
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
  } = useForm<ClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: '',
      accountManagerId: '',
      name: '',
      code: '',
      industry: '',
      website: '',
      email: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      description: '',
      isActive: true,
    },
  });

  const selectedOrganizationId = useWatch({ control, name: 'organizationId' });

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
        organizationId: client?.organizationId ?? defaultOrganizationId ?? '',
        accountManagerId: client?.accountManagerId ?? '',
        name: client?.name ?? '',
        code: client?.code ?? '',
        industry: client?.industry ?? '',
        website: client?.website ?? '',
        email: client?.email ?? '',
        phone: client?.phone ?? '',
        addressLine1: client?.addressLine1 ?? '',
        addressLine2: client?.addressLine2 ?? '',
        city: client?.city ?? '',
        state: client?.state ?? '',
        country: client?.country ?? '',
        postalCode: client?.postalCode ?? '',
        contactName: client?.contactName ?? '',
        contactEmail: client?.contactEmail ?? '',
        contactPhone: client?.contactPhone ?? '',
        description: client?.description ?? '',
        isActive: client?.isActive ?? true,
      });
    }
  }, [open, client, defaultOrganizationId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Client' : 'Edit Client'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="client-form"
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
              name="accountManagerId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Account Manager"
                  disabled={!selectedOrganizationId}
                  helperText="Optional"
                >
                  <MenuItem value="">
                    <em>No account manager</em>
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
              placeholder="GLOBEX"
              error={Boolean(errors.code)}
              helperText={errors.code?.message}
              {...register('code')}
            />
            <TextField label="Industry" {...register('industry')} />
            <TextField label="Website" {...register('website')} />
            <TextField
              label="Email"
              type="email"
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              {...register('email')}
            />
            <TextField label="Phone" {...register('phone')} />

            <Divider />
            <Typography variant="overline" color="text.secondary">
              Address
            </Typography>
            <TextField label="Address Line 1" {...register('addressLine1')} />
            <TextField label="Address Line 2" {...register('addressLine2')} />
            <Stack direction="row" spacing={2}>
              <TextField label="City" fullWidth {...register('city')} />
              <TextField label="State" fullWidth {...register('state')} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Country" fullWidth {...register('country')} />
              <TextField label="Postal Code" fullWidth {...register('postalCode')} />
            </Stack>

            <Divider />
            <Typography variant="overline" color="text.secondary">
              Primary Contact
            </Typography>
            <TextField label="Contact Name" {...register('contactName')} />
            <TextField
              label="Contact Email"
              type="email"
              error={Boolean(errors.contactEmail)}
              helperText={errors.contactEmail?.message}
              {...register('contactEmail')}
            />
            <TextField label="Contact Phone" {...register('contactPhone')} />

            <Divider />
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
        <Button type="submit" form="client-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
