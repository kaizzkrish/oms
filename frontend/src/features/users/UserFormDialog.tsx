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
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { UserRecord } from './usersApi';

const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_POLICY_MESSAGE =
  'Must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';

function buildSchema(mode: 'create' | 'edit') {
  return z.object({
    email: z.string().email('Enter a valid email address'),
    password:
      mode === 'create'
        ? z.string().regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE)
        : z.string(),
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    isActive: z.boolean(),
  });
}

export type UserFormValues = z.infer<ReturnType<typeof buildSchema>>;

interface UserFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  user?: UserRecord;
  submitting?: boolean;
  onSubmit: (values: UserFormValues) => void;
  onClose: () => void;
}

export function UserFormDialog({
  open,
  mode,
  user,
  submitting = false,
  onSubmit,
  onClose,
}: UserFormDialogProps) {
  const schema = useMemo(() => buildSchema(mode), [mode]);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '', isActive: true },
  });

  useEffect(() => {
    if (open) {
      reset({
        email: user?.email ?? '',
        password: '',
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        isActive: user?.isActive ?? true,
      });
    }
  }, [open, user, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New User' : 'Edit User'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="user-form"
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              {...register('email')}
            />
            {mode === 'create' ? (
              <TextField
                label="Password"
                type="password"
                autoComplete="new-password"
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                {...register('password')}
              />
            ) : null}
            <TextField
              label="First name"
              error={Boolean(errors.firstName)}
              helperText={errors.firstName?.message}
              {...register('firstName')}
            />
            <TextField
              label="Last name"
              error={Boolean(errors.lastName)}
              helperText={errors.lastName?.message}
              {...register('lastName')}
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
        <Button type="submit" form="user-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
